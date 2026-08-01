package handlers

import (
	"fmt"
	"machining-erp/internal/middleware"
	"machining-erp/pkg/response"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type StatsHandler struct {
	db *gorm.DB
}

func NewStatsHandler(db *gorm.DB) *StatsHandler {
	return &StatsHandler{db: db}
}

type MonthlyOutputItem struct {
	Month                 string  `json:"month"`
	OutputAmount          float64 `json:"output_amount"`
	OrderCount            int64   `json:"order_count"`
	ItemCount             int64   `json:"item_count"`
	PartQuantity          int64   `json:"part_quantity"`
	ZeroPricePartQuantity int64   `json:"zero_price_part_quantity"`
}

type MonthlyOutputResult struct {
	Year                  int                 `json:"year"`
	Total                 float64             `json:"total"`
	OrderCount            int64               `json:"order_count"`
	ItemCount             int64               `json:"item_count"`
	PartQuantity          int64               `json:"part_quantity"`
	ZeroPricePartQuantity int64               `json:"zero_price_part_quantity"`
	Months                []MonthlyOutputItem `json:"months"`
}

type CustomerMonthlyOutputItem struct {
	CustomerName string  `json:"customer_name"`
	OutputAmount float64 `json:"output_amount"`
	OrderCount   int64   `json:"order_count"`
	ItemCount    int64   `json:"item_count"`
	PartQuantity int64   `json:"part_quantity"`
}

type CustomerMonthlyOutputResult struct {
	Month    string                      `json:"month"`
	DateType string                      `json:"date_type"`
	Total    float64                     `json:"total"`
	Items    []CustomerMonthlyOutputItem `json:"items"`
}

func (h *StatsHandler) GetMonthlyOutput(c *gin.Context) {
	year := time.Now().Year()
	if yearParam := c.Query("year"); yearParam != "" {
		parsedYear, err := strconv.Atoi(yearParam)
		if err != nil || parsedYear < 2000 || parsedYear > 2100 {
			response.BadRequest(c, response.CodeInvalidRequest, "年份参数无效")
			return
		}
		year = parsedYear
	}

	dateType := c.DefaultQuery("dateType", "order_date")
	dateColumn := "oi.completion_date"
	switch dateType {
	case "completion_date":
		dateColumn = "oi.completion_date"
	case "order_date":
		dateColumn = "o.start_date"
	default:
		response.BadRequest(c, response.CodeInvalidRequest, "日期类型参数无效")
		return
	}

	corpID := middleware.GetCorpID(c)
	var rows []MonthlyOutputItem
	err := h.db.Table("order_items AS oi").
		Select(fmt.Sprintf(`
			DATE_FORMAT(%s, '%%Y-%%m') AS month,
			COALESCE(SUM(CASE
				WHEN oi.total_price IS NOT NULL AND oi.total_price > 0 THEN oi.total_price
				ELSE oi.quantity * oi.unit_price
			END), 0) AS output_amount,
			COUNT(DISTINCT o.id) AS order_count,
			COUNT(oi.id) AS item_count,
			COALESCE(SUM(oi.quantity), 0) AS part_quantity,
			COUNT(CASE WHEN oi.unit_price = 0 THEN 1 END) AS zero_price_part_quantity
		`, dateColumn)).
		Joins("JOIN orders AS o ON o.id = oi.order_id").
		Where(dateColumn+" IS NOT NULL").
		Where(fmt.Sprintf("YEAR(%s) = ?", dateColumn), year).
		Where("o.corp_id = ?", corpID).
		Group("month").
		Order("month").
		Scan(&rows).Error

	if err != nil {
		response.InternalError(c, response.CodeInternal, err.Error())
		return
	}

	monthMap := make(map[string]MonthlyOutputItem, len(rows))
	for _, row := range rows {
		monthMap[row.Month] = row
	}

	result := MonthlyOutputResult{
		Year:   year,
		Months: make([]MonthlyOutputItem, 0, 12),
	}
	seenOrders := int64(0)
	for month := 1; month <= 12; month++ {
		monthKey := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local).Format("2006-01")
		item, ok := monthMap[monthKey]
		if !ok {
			item = MonthlyOutputItem{Month: monthKey}
		}
		result.Total += item.OutputAmount
		result.ItemCount += item.ItemCount
		result.PartQuantity += item.PartQuantity
		result.ZeroPricePartQuantity += item.ZeroPricePartQuantity
		seenOrders += item.OrderCount
		result.Months = append(result.Months, item)
	}
	result.OrderCount = seenOrders

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": result,
	})
}

func (h *StatsHandler) GetMonthlyOutputByCustomer(c *gin.Context) {
	month := c.Query("month")
	parsedMonth, err := time.Parse("2006-01", month)
	if err != nil {
		response.BadRequest(c, response.CodeInvalidRequest, "月份参数无效")
		return
	}

	dateType := c.DefaultQuery("dateType", "order_date")
	dateColumn := "o.start_date"
	switch dateType {
	case "order_date":
		dateColumn = "o.start_date"
	case "completion_date":
		dateColumn = "oi.completion_date"
	default:
		response.BadRequest(c, response.CodeInvalidRequest, "日期类型参数无效")
		return
	}

	corpID := middleware.GetCorpID(c)
	monthKey := parsedMonth.Format("2006-01")
	var items []CustomerMonthlyOutputItem
	err = h.db.Table("order_items AS oi").
		Select(fmt.Sprintf(`
			COALESCE(
				NULLIF(MAX(o.customer_short_name), ''),
				NULLIF(MAX(o.customer_name), ''),
				'未命名客户'
			) AS customer_name,
			COALESCE(SUM(CASE
				WHEN oi.total_price IS NOT NULL AND oi.total_price > 0 THEN oi.total_price
				ELSE oi.quantity * oi.unit_price
			END), 0) AS output_amount,
			COUNT(DISTINCT o.id) AS order_count,
			COUNT(oi.id) AS item_count,
			COALESCE(SUM(oi.quantity), 0) AS part_quantity
		`)).
		Joins("JOIN orders AS o ON o.id = oi.order_id").
		Where(dateColumn+" IS NOT NULL").
		Where(fmt.Sprintf("DATE_FORMAT(%s, '%%Y-%%m') = ?", dateColumn), monthKey).
		Where("o.corp_id = ?", corpID).
		Group("o.customer_id").
		Order("output_amount DESC").
		Scan(&items).Error

	if err != nil {
		response.InternalError(c, response.CodeInternal, err.Error())
		return
	}

	result := CustomerMonthlyOutputResult{
		Month:    monthKey,
		DateType: dateType,
		Items:    items,
	}
	for _, item := range items {
		result.Total += item.OutputAmount
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": result,
	})
}

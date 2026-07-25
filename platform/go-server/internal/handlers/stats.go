package handlers

import (
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

	corpID := middleware.GetCorpID(c)
	var rows []MonthlyOutputItem
	err := h.db.Table("order_items AS oi").
		Select(`
			DATE_FORMAT(oi.completion_date, '%Y-%m') AS month,
			COALESCE(SUM(CASE
				WHEN oi.total_price IS NOT NULL AND oi.total_price > 0 THEN oi.total_price
				ELSE oi.quantity * oi.unit_price
			END), 0) AS output_amount,
			COUNT(DISTINCT o.id) AS order_count,
			COUNT(oi.id) AS item_count,
			COALESCE(SUM(oi.quantity), 0) AS part_quantity,
			COUNT(CASE WHEN oi.unit_price = 0 THEN 1 END) AS zero_price_part_quantity
		`).
		Joins("JOIN orders AS o ON o.id = oi.order_id").
		Where("oi.completion_date IS NOT NULL").
		Where("YEAR(oi.completion_date) = ?", year).
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

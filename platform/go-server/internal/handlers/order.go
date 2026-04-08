package handlers

import (
	"fmt"
	"machining-erp/internal/middleware"
	"machining-erp/internal/models"
	"machining-erp/internal/repository"
	"machining-erp/internal/services"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	repo        *repository.OrderRepository
	itemRepo    *repository.OrderItemRepository
	processRepo *repository.OrderProcessRepository
	orderNumSvc *services.OrderNumberService
}

func NewOrderHandler(repo *repository.OrderRepository, itemRepo *repository.OrderItemRepository, processRepo *repository.OrderProcessRepository, orderNumSvc *services.OrderNumberService) *OrderHandler {
	return &OrderHandler{
		repo:        repo,
		itemRepo:    itemRepo,
		processRepo: processRepo,
		orderNumSvc: orderNumSvc,
	}
}

func (h *OrderHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if pageSize <= 0 {
		pageSize = 20 // 默认每页20条
	}
	if page <= 0 {
		page = 1
	}

	filters := repository.OrderFilters{
		CorpID:       middleware.GetCorpID(c),
		DueDateStart: c.Query("dueDateStart"),
		DueDateEnd:   c.Query("dueDateEnd"),
		OrderNumber:  c.Query("orderNumber"),
		PartNumber:   c.Query("partNumber"),
		CustomerName: c.Query("customerName"),
		Priority:     c.Query("priority"),
		Status:       c.Query("status"),
		DateType:     c.Query("dateType"), // overdue, warning, near_due
		Page:         page,
		PageSize:     pageSize,
	}

	result, err := h.repo.GetWithFilters(filters)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{
		"data":     result.Orders,
		"total":    result.Total,
		"page":     page,
		"pageSize": pageSize,
	})
}

type CreateOrderRequest struct {
	CustomerID        *int64          `json:"customer_id"`
	CustomerName      *string         `json:"customer_name"`
	CustomerShortName *string         `json:"customer_short_name"`
	OrderNumber       string          `json:"order_number"`
	OrderName         *string         `json:"order_name"`
	ContactName       *string         `json:"contact_name"`
	Priority          models.Priority `json:"priority"`
	StartDate         string          `json:"start_date"`
	DueDate           string          `json:"due_date"`
	TotalAmount       float64         `json:"total_amount"`
	Notes             *string         `json:"notes"`
	Items             []CreateOrderItemRequest `json:"items"`
}

// CreateOrderItemRequest 创建订单项请求结构体（日期用string避免解析问题）
type CreateOrderItemRequest struct {
	ID              *int64                   `json:"id"`
	OrderID         *int64                   `json:"order_id"`
	PartName        string                   `json:"part_name"`
	PartNumber      *string                  `json:"part_number"`
	Quantity        int                      `json:"quantity"`
	ScrapQuantity   int                      `json:"scrap_quantity"`
	UnitPrice       float64                  `json:"unit_price"`
	TotalPrice      float64                  `json:"total_price"`
	Status          models.OrderStatus       `json:"status"`
	DrawingData     *string                  `json:"drawing_data"`
	Notes           *string                  `json:"notes"`
	StartDate       string                   `json:"start_date"`
	DueDate         string                   `json:"due_date"`
	DeliveredQty    int                      `json:"delivered_quantity"`
	ToolCost        float64                  `json:"tool_cost"`
	FixtureCost     float64                  `json:"fixture_cost"`
	MaterialCost    float64                  `json:"material_cost"`
	OtherCost       float64                  `json:"other_cost"`
	ItemNotes       *string                  `json:"item_notes"`
	CompletionDate  string                   `json:"completion_date"`
	Processes       []ProcessRequest         `json:"processes"`
}

// ProcessRequest 工序请求结构体
type ProcessRequest struct {
	ID             *int64               `json:"id"`
	OrderItemID    *int64               `json:"order_item_id"`
	Name           string               `json:"name"`
	IsOutsourced   bool                 `json:"is_outsourced"`
	OutsourcingFee float64              `json:"outsourcing_fee"`
	Status         models.ProcessStatus `json:"status"`
	SortOrder      int                  `json:"sort_order"`
}

func parseDate(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

func floatPtr(v float64) *float64 {
	return &v
}

func intPtr(v int) *int {
	return &v
}

func (h *OrderHandler) Create(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.CustomerID == nil || req.StartDate == "" || req.DueDate == "" {
		c.JSON(400, gin.H{"error": "Missing customer_id, start_date or due_date"})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(400, gin.H{"error": "订单必须包含至少一个零件"})
		return
	}

	for i, item := range req.Items {
		if item.PartName == "" {
			c.JSON(400, gin.H{"error": fmt.Sprintf("零件名称不能为空 (第 %d 行)", i+1)})
			return
		}
	}

	orderNumber := req.OrderNumber
	if orderNumber == "" {
		var err error
		orderNumber, err = h.orderNumSvc.Generate()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
	}

	order := &models.Order{
		CustomerID:        req.CustomerID,
		CustomerName:      req.CustomerName,
		CustomerShortName: req.CustomerShortName,
		OrderNumber:       orderNumber,
		OrderName:         req.OrderName,
		ContactName:       req.ContactName,
		Priority:          req.Priority,
		StartDate:         parseDate(req.StartDate),
		DueDate:           parseDate(req.DueDate),
		Notes:             req.Notes,
		TotalAmount:       req.TotalAmount,
	}

	// 转换请求结构体为models
	items := make([]models.OrderItem, len(req.Items))
	for i, reqItem := range req.Items {
		// 转换工序
		processes := make([]models.OrderProcess, len(reqItem.Processes))
		for j, p := range reqItem.Processes {
			var processID, orderItemID int64
			if p.ID != nil {
				processID = *p.ID
			}
			if p.OrderItemID != nil {
				orderItemID = *p.OrderItemID
			}
			processes[j] = models.OrderProcess{
				ID:             processID,
				OrderItemID:    orderItemID,
				Name:           p.Name,
				IsOutsourced:   p.IsOutsourced,
				OutsourcingFee: p.OutsourcingFee,
				Status:         p.Status,
			}
		}
		var itemID, orderID int64
		if reqItem.ID != nil {
			itemID = *reqItem.ID
		}
		if reqItem.OrderID != nil {
			orderID = *reqItem.OrderID
		}
		items[i] = models.OrderItem{
			ID:             itemID,
			OrderID:        orderID,
			PartName:       reqItem.PartName,
			PartNumber:     reqItem.PartNumber,
			Quantity:       reqItem.Quantity,
			ScrapQuantity:  reqItem.ScrapQuantity,
			UnitPrice:      reqItem.UnitPrice,
			TotalPrice:     reqItem.TotalPrice,
			Status:         reqItem.Status,
			DrawingData:    reqItem.DrawingData,
			Notes:          reqItem.Notes,
			StartDate:      parseDate(reqItem.StartDate),
			DueDate:        parseDate(reqItem.DueDate),
			DeliveredQty:   intPtr(reqItem.DeliveredQty),
			ToolCost:       floatPtr(reqItem.ToolCost),
			FixtureCost:    floatPtr(reqItem.FixtureCost),
			MaterialCost:   floatPtr(reqItem.MaterialCost),
			OtherCost:      floatPtr(reqItem.OtherCost),
			ItemNotes:      reqItem.ItemNotes,
			CompletionDate: parseDate(reqItem.CompletionDate),
			Processes:      processes,
		}
	}

	id, err := h.repo.Create(order, items)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"id": id})
}

type UpdateOrderRequest struct {
	CustomerID        *int64            `json:"customer_id"`
	CustomerName      *string           `json:"customer_name"`
	CustomerShortName *string           `json:"customer_short_name"`
	OrderName         *string           `json:"order_name"`
	ContactName       *string           `json:"contact_name"`
	Priority          models.Priority   `json:"priority"`
	StartDate         string            `json:"start_date"`
	DueDate           string            `json:"due_date"`
	Notes             *string           `json:"notes"`
	TotalAmount       float64           `json:"total_amount"`
	Status            models.OrderStatus `json:"status"`
	Items             []CreateOrderItemRequest `json:"items"`
}

func (h *OrderHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req UpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.StartDate == "" || req.DueDate == "" {
		c.JSON(400, gin.H{"error": "start_date and due_date cannot be empty"})
		return
	}

	order := &models.Order{
		ID:                id,
		CustomerID:        req.CustomerID,
		CustomerName:      req.CustomerName,
		CustomerShortName: req.CustomerShortName,
		OrderName:         req.OrderName,
		ContactName:       req.ContactName,
		Priority:          req.Priority,
		StartDate:         parseDate(req.StartDate),
		DueDate:           parseDate(req.DueDate),
		Notes:             req.Notes,
		TotalAmount:       req.TotalAmount,
	}

	// 转换请求结构体为models
	items := make([]models.OrderItem, len(req.Items))
	for i, reqItem := range req.Items {
		// 转换工序
		processes := make([]models.OrderProcess, len(reqItem.Processes))
		for j, p := range reqItem.Processes {
			var processID, orderItemID int64
			if p.ID != nil {
				processID = *p.ID
			}
			if p.OrderItemID != nil {
				orderItemID = *p.OrderItemID
			}
			processes[j] = models.OrderProcess{
				ID:             processID,
				OrderItemID:    orderItemID,
				Name:           p.Name,
				IsOutsourced:   p.IsOutsourced,
				OutsourcingFee: p.OutsourcingFee,
				Status:         p.Status,
			}
		}
		var itemID, orderID int64
		if reqItem.ID != nil {
			itemID = *reqItem.ID
		}
		if reqItem.OrderID != nil {
			orderID = *reqItem.OrderID
		}
		items[i] = models.OrderItem{
			ID:             itemID,
			OrderID:        orderID,
			PartName:       reqItem.PartName,
			PartNumber:     reqItem.PartNumber,
			Quantity:       reqItem.Quantity,
			ScrapQuantity:  reqItem.ScrapQuantity,
			UnitPrice:      reqItem.UnitPrice,
			TotalPrice:     reqItem.TotalPrice,
			Status:         reqItem.Status,
			DrawingData:    reqItem.DrawingData,
			Notes:          reqItem.Notes,
			StartDate:      parseDate(reqItem.StartDate),
			DueDate:        parseDate(reqItem.DueDate),
			DeliveredQty:   intPtr(reqItem.DeliveredQty),
			ToolCost:       floatPtr(reqItem.ToolCost),
			FixtureCost:    floatPtr(reqItem.FixtureCost),
			MaterialCost:   floatPtr(reqItem.MaterialCost),
			OtherCost:      floatPtr(reqItem.OtherCost),
			ItemNotes:      reqItem.ItemNotes,
			CompletionDate: parseDate(reqItem.CompletionDate),
			Processes:      processes,
		}
	}

	if err := h.repo.Update(order, items); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"success": true})
}

func (h *OrderHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	if err := h.repo.Delete(id); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"success": true})
}

// GetDashboardItems 获取工作看板零件数据
func (h *OrderHandler) GetDashboardItems(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))

	result, err := h.repo.GetDashboardItems(middleware.GetCorpID(c), page, pageSize)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{
		"code": 0,
		"data": result,
	})
}

// GetDashboardStats 获取看板卡片统计数据
func (h *OrderHandler) GetDashboardStats(c *gin.Context) {
	stats, err := h.repo.GetDashboardStats(middleware.GetCorpID(c))
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{
		"code": 0,
		"data": stats,
	})
}
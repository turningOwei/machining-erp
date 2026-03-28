package handlers

import (
	"machining-erp/internal/repository"
	"machining-erp/internal/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type OrderItemHandler struct {
	itemRepo    *repository.OrderItemRepository
	orderRepo   *repository.OrderRepository
	processRepo *repository.OrderProcessRepository
}

func NewOrderItemHandler(itemRepo *repository.OrderItemRepository, orderRepo *repository.OrderRepository, processRepo *repository.OrderProcessRepository) *OrderItemHandler {
	return &OrderItemHandler{
		itemRepo:    itemRepo,
		orderRepo:   orderRepo,
		processRepo: processRepo,
	}
}

func (h *OrderItemHandler) Update(c *gin.Context) {
	itemID, _ := strconv.Atoi(c.Param("itemId"))

	var req struct {
		Status         *string `json:"status"`
		CompletionDate *string `json:"completion_date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.Status != nil {
		if err := h.itemRepo.UpdateStatus(itemID, *req.Status); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		// 根据零件状态自动更新完工日期
		if *req.Status == "completed" {
			today := services.FormatDateNow()
			if err := h.itemRepo.UpdateCompletionDate(itemID, today); err != nil {
				c.JSON(500, gin.H{"error": "Failed to update completion date: " + err.Error()})
				return
			}
		} else {
			if err := h.itemRepo.UpdateCompletionDate(itemID, ""); err != nil {
				c.JSON(500, gin.H{"error": "Failed to clear completion date: " + err.Error()})
				return
			}
		}

		// 更新订单状态
		orderID := h.itemRepo.GetOrderID(itemID)
		if orderID > 0 {
			items, _ := h.itemRepo.GetByOrderID(orderID)
			var statuses []string
			for _, item := range items {
				statuses = append(statuses, string(item.Status))
			}
			newStatus := services.CalculateStatus(statuses)
			h.orderRepo.UpdateStatus(orderID, newStatus)
		}
	}

	if req.CompletionDate != nil {
		if err := h.itemRepo.UpdateCompletionDate(itemID, *req.CompletionDate); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(200, gin.H{"success": true})
}

type ProcessHandler struct {
	processRepo *repository.OrderProcessRepository
	itemRepo    *repository.OrderItemRepository
	orderRepo   *repository.OrderRepository
}

func NewProcessHandler(processRepo *repository.OrderProcessRepository, itemRepo *repository.OrderItemRepository, orderRepo *repository.OrderRepository) *ProcessHandler {
	return &ProcessHandler{
		processRepo: processRepo,
		itemRepo:    itemRepo,
		orderRepo:   orderRepo,
	}
}

func (h *ProcessHandler) Update(c *gin.Context) {
	itemID, _ := strconv.Atoi(c.Param("itemId"))
	processID, _ := strconv.Atoi(c.Param("processId"))

	var req struct {
		Status         *string  `json:"status"`
		IsOutsourced   *bool    `json:"is_outsourced"`
		OutsourcingFee *float64 `json:"outsourcing_fee"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// 更新工序
	if err := h.processRepo.Update(processID, req.Status, req.IsOutsourced, req.OutsourcingFee); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// 重新计算订单项状态
	statuses, _ := h.processRepo.GetStatusesByItemID(itemID)
	newItemStatus := services.CalculateStatus(statuses)

	// 更新订单项状态
	if err := h.itemRepo.UpdateStatus(itemID, newItemStatus); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// 根据零件状态自动更新完工日期
	if newItemStatus == "completed" {
		today := services.FormatDateNow()
		if err := h.itemRepo.UpdateCompletionDate(itemID, today); err != nil {
			c.JSON(500, gin.H{"error": "Failed to update completion date: " + err.Error()})
			return
		}
	} else {
		if err := h.itemRepo.UpdateCompletionDate(itemID, ""); err != nil {
			c.JSON(500, gin.H{"error": "Failed to clear completion date: " + err.Error()})
			return
		}
	}

	// 重新计算订单状态
	orderID := h.itemRepo.GetOrderID(itemID)
	if orderID > 0 {
		items, _ := h.itemRepo.GetByOrderID(orderID)
		var orderStatuses []string
		for _, item := range items {
			orderStatuses = append(orderStatuses, string(item.Status))
		}
		newOrderStatus := services.CalculateStatus(orderStatuses)
		h.orderRepo.UpdateStatus(orderID, newOrderStatus)
	}

	c.JSON(200, gin.H{"success": true})
}
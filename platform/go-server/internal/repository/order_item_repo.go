package repository

import (
	"time"

	"gorm.io/gorm"
	"machining-erp/internal/models"
	"machining-erp/internal/services"
)

type OrderItemRepository struct {
	db *gorm.DB
}

func NewOrderItemRepository(db *gorm.DB) *OrderItemRepository {
	return &OrderItemRepository{db: db}
}

func (r *OrderItemRepository) GetByOrderID(orderID int) ([]models.OrderItem, error) {
	var items []models.OrderItem
	err := r.db.Where("order_id = ?", orderID).Order("due_date ASC").Preload("Processes").Find(&items).Error
	return items, err
}

func (r *OrderItemRepository) UpdateStatus(id int, status string) error {
	return r.db.Model(&models.OrderItem{}).Where("id = ?", id).Update("status", status).Error
}

func (r *OrderItemRepository) UpdateCompletionDate(id int, completionDate string) error {
	if completionDate == "" {
		return r.db.Model(&models.OrderItem{}).Where("id = ?", id).Update("completion_date", nil).Error
	}
	t, err := time.Parse("2006-01-02", completionDate)
	if err != nil {
		return err
	}
	return r.db.Model(&models.OrderItem{}).Where("id = ?", id).Update("completion_date", t).Error
}

func (r *OrderItemRepository) GetOrderID(itemID int) int {
	var item models.OrderItem
	r.db.First(&item, itemID)
	return item.OrderID
}

type OrderProcessRepository struct {
	db *gorm.DB
}

func NewOrderProcessRepository(db *gorm.DB) *OrderProcessRepository {
	return &OrderProcessRepository{db: db}
}

func (r *OrderProcessRepository) GetByOrderItemID(itemID int) ([]models.OrderProcess, error) {
	var processes []models.OrderProcess
	err := r.db.Where("order_item_id = ?", itemID).Order("sort_order ASC").Find(&processes).Error
	return processes, err
}

func (r *OrderProcessRepository) Update(processID int, status *string, isOutsourced *bool, outsourcingFee *float64) error {
	updates := map[string]interface{}{}
	if status != nil {
		updates["status"] = *status
	}
	if isOutsourced != nil {
		updates["is_outsourced"] = *isOutsourced
	}
	if outsourcingFee != nil {
		updates["outsourcing_fee"] = *outsourcingFee
	}
	return r.db.Model(&models.OrderProcess{}).Where("id = ?", processID).Updates(updates).Error
}

func (r *OrderProcessRepository) GetStatusesByItemID(itemID int) ([]string, error) {
	var statuses []string
	err := r.db.Model(&models.OrderProcess{}).Where("order_item_id = ?", itemID).Pluck("status", &statuses).Error
	return statuses, err
}

// RecalculateItemStatus 重新计算订单项状态并更新
func (r *OrderProcessRepository) RecalculateItemStatus(itemID int) error {
	statuses, err := r.GetStatusesByItemID(itemID)
	if err != nil {
		return err
	}
	newStatus := services.CalculateStatus(statuses)
	return r.db.Model(&models.OrderItem{}).Where("id = ?", itemID).Update("status", newStatus).Error
}
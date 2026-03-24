package models

import (
	"time"
)

type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "pending"
	OrderStatusProcessing OrderStatus = "processing"
	OrderStatusCompleted  OrderStatus = "completed"
	OrderStatusDelivered  OrderStatus = "delivered"
)

type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
)

type Order struct {
	ID              int         `json:"id"`
	CustomerID      *int        `json:"customer_id"`
	CustomerName    *string     `json:"customer_name"`
	CustomerShortName *string   `json:"customer_short_name"`
	OrderNumber     string      `json:"order_number"`
	Status          OrderStatus `json:"status"`
	Priority        Priority    `json:"priority"`
	StartDate       *time.Time  `json:"start_date"`
	DueDate         *time.Time  `json:"due_date"`
	Notes           *string     `json:"notes"`
	CreatedAt       time.Time   `json:"created_at"`
	Items           []OrderItem `json:"items"`
}

type OrderItem struct {
	ID             int           `json:"id"`
	OrderID        int           `json:"order_id"`
	PartName       string        `json:"part_name"`
	PartNumber     NullString    `json:"part_number"`
	Quantity       int           `json:"quantity"`
	ScrapQuantity  int           `json:"scrap_quantity"`
	UnitPrice      float64       `json:"unit_price"`
	TotalPrice     float64       `json:"total_price"`
	Status         OrderStatus   `json:"status"`
	DrawingData    NullString    `json:"drawing_data,omitempty"`
	Notes          NullString    `json:"notes,omitempty"`
	CompletionDate Date          `json:"completion_date,omitempty"`
	StartDate      Date          `json:"start_date,omitempty"`
	DueDate        Date          `json:"due_date,omitempty"`
	DeliveredQty   NullInt64     `json:"delivered_quantity,omitempty"`
	ToolCost       NullFloat64   `json:"tool_cost,omitempty"`
	FixtureCost    NullFloat64   `json:"fixture_cost,omitempty"`
	MaterialCost   NullFloat64   `json:"material_cost,omitempty"`
	OtherCost      NullFloat64   `json:"other_cost,omitempty"`
	ItemNotes      NullString    `json:"item_notes,omitempty"`
	Processes      []OrderProcess `json:"processes"`
}

type OrderProcess struct {
	ID             int           `json:"id"`
	OrderItemID    int           `json:"order_item_id"`
	Name           string        `json:"name"`
	IsOutsourced   bool          `json:"is_outsourced"`
	OutsourcingFee float64       `json:"outsourcing_fee"`
	Status         ProcessStatus `json:"status"`
	SortOrder      int           `json:"sort_order"`
}

type ProcessStatus string

const (
	ProcessStatusPending    ProcessStatus = "pending"
	ProcessStatusProcessing ProcessStatus = "processing"
	ProcessStatusCompleted  ProcessStatus = "completed"
)

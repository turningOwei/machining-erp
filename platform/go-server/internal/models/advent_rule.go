package models

import "time"

type AdventRule struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description,omitempty"`
	Formula      string    `json:"formula"`
	TargetStatus string    `json:"target_status"`
	ScopeType    string    `json:"scopeType"`
	RuleType     string    `json:"ruleType"`
	CreatedAt    time.Time `json:"created_at"`
}

type Reconciliation struct {
	Month           string  `json:"month"`
	TotalAmount     float64 `json:"total_amount"`
	OrderCount      int     `json:"order_count"`
	DeliveredAmount float64 `json:"delivered_amount"`
}

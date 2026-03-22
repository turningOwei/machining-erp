package handlers

import (
	"database/sql"

	"github.com/gin-gonic/gin"
)

type FinanceHandler struct {
	db *sql.DB
}

func NewFinanceHandler(db *sql.DB) *FinanceHandler {
	return &FinanceHandler{db: db}
}

type Reconciliation struct {
	Month           string  `json:"month"`
	TotalAmount     float64 `json:"total_amount"`
	OrderCount      int     `json:"order_count"`
	DeliveredAmount float64 `json:"delivered_amount"`
}

func (h *FinanceHandler) GetReconciliation(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT
			DATE_FORMAT(orders.due_date, '%Y-%m') as month,
			SUM(order_items.total_price) as total_amount,
			COUNT(DISTINCT orders.id) as order_count,
			SUM(CASE WHEN order_items.status = 'delivered' THEN order_items.total_price ELSE 0 END) as delivered_amount
		FROM orders
		JOIN order_items ON orders.id = order_items.order_id
		GROUP BY month
		ORDER BY month DESC
	`)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var results []Reconciliation
	for rows.Next() {
		var r Reconciliation
		err := rows.Scan(&r.Month, &r.TotalAmount, &r.OrderCount, &r.DeliveredAmount)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		results = append(results, r)
	}
	c.JSON(200, results)
}

package repository

import (
	"database/sql"
	"machining-erp/internal/models"
)

type OrderItemRepository struct {
	db *sql.DB
}

func NewOrderItemRepository(db *sql.DB) *OrderItemRepository {
	return &OrderItemRepository{db: db}
}

func (r *OrderItemRepository) GetByOrderID(orderID int) ([]models.OrderItem, error) {
	rows, err := r.db.Query(`
		SELECT id, order_id, part_name, part_number, quantity, scrap_quantity, unit_price, total_price,
		       status, drawing_data, notes, completion_date, start_date, due_date, delivered_quantity,
		       tool_cost, fixture_cost, material_cost, other_cost, item_notes
		FROM order_items WHERE order_id = ? ORDER BY due_date ASC
	`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.OrderItem = []models.OrderItem{} // 初始化为空数组，避免 null
	for rows.Next() {
		var item models.OrderItem
		err := rows.Scan(
			&item.ID, &item.OrderID, &item.PartName, &item.PartNumber, &item.Quantity, &item.ScrapQuantity,
			&item.UnitPrice, &item.TotalPrice, &item.Status, &item.DrawingData, &item.Notes,
			&item.CompletionDate, &item.StartDate, &item.DueDate, &item.DeliveredQty,
			&item.ToolCost, &item.FixtureCost, &item.MaterialCost, &item.OtherCost, &item.ItemNotes,
		)
		if err != nil {
			return nil, err
		}

		// 获取工序
		processRepo := NewOrderProcessRepository(r.db)
		item.Processes, _ = processRepo.GetByOrderItemID(item.ID)

		items = append(items, item)
	}
	return items, nil
}

func (r *OrderItemRepository) UpdateStatus(id int, status string) error {
	_, err := r.db.Exec("UPDATE order_items SET status = ? WHERE id = ?", status, id)
	return err
}

func (r *OrderItemRepository) UpdateCompletionDate(id int, completionDate string) error {
	if completionDate == "" {
		_, err := r.db.Exec("UPDATE order_items SET completion_date = NULL WHERE id = ?", id)
		return err
	}
	_, err := r.db.Exec("UPDATE order_items SET completion_date = ? WHERE id = ?", completionDate, id)
	return err
}

func (r *OrderItemRepository) GetOrderID(itemID int) int {
	var orderID int
	r.db.QueryRow("SELECT order_id FROM order_items WHERE id = ?", itemID).Scan(&orderID)
	return orderID
}

type OrderProcessRepository struct {
	db *sql.DB
}

func NewOrderProcessRepository(db *sql.DB) *OrderProcessRepository {
	return &OrderProcessRepository{db: db}
}

func (r *OrderProcessRepository) GetByOrderItemID(itemID int) ([]models.OrderProcess, error) {
	rows, err := r.db.Query(`
		SELECT id, order_item_id, name, is_outsourced, outsourcing_fee, status, sort_order
		FROM order_processes WHERE order_item_id = ? ORDER BY sort_order ASC
	`, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var processes []models.OrderProcess = []models.OrderProcess{} // 初始化为空数组，避免 null
	for rows.Next() {
		var p models.OrderProcess
		var isOutsourced int
		err := rows.Scan(&p.ID, &p.OrderItemID, &p.Name, &isOutsourced, &p.OutsourcingFee, &p.Status, &p.SortOrder)
		if err != nil {
			return nil, err
		}
		p.IsOutsourced = isOutsourced == 1
		processes = append(processes, p)
	}
	return processes, nil
}

func (r *OrderProcessRepository) Update(processID int, status *string, isOutsourced *bool, outsourcingFee *float64) error {
	var updates []string
	var args []interface{}

	if status != nil {
		updates = append(updates, "status = ?")
		args = append(args, *status)
	}
	if isOutsourced != nil {
		updates = append(updates, "is_outsourced = ?")
		if *isOutsourced {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
	}
	if outsourcingFee != nil {
		updates = append(updates, "outsourcing_fee = ?")
		args = append(args, *outsourcingFee)
	}

	if len(updates) == 0 {
		return nil
	}

	args = append(args, processID)
	query := "UPDATE order_processes SET " + updates[0]
	for i := 1; i < len(updates); i++ {
		query += ", " + updates[i]
	}
	query += " WHERE id = ?"

	_, err := r.db.Exec(query, args...)
	return err
}

func (r *OrderProcessRepository) GetStatusesByItemID(itemID int) ([]string, error) {
	rows, err := r.db.Query("SELECT status FROM order_processes WHERE order_item_id = ?", itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var statuses []string = []string{} // 初始化为空数组，避免 null
	for rows.Next() {
		var s string
		rows.Scan(&s)
		statuses = append(statuses, s)
	}
	return statuses, nil
}

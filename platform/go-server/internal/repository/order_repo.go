package repository

import (
	"database/sql"
	"machining-erp/internal/models"
	"machining-erp/internal/services"
	"time"
)

type OrderRepository struct {
	db *sql.DB
}

func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func (r *OrderRepository) GetAllWithItems() ([]models.Order, error) {
	// 获取所有订单
	rows, err := r.db.Query(`
		SELECT orders.id, orders.customer_id, COALESCE(orders.customer_name, customers.name) as customer_name,
		       orders.order_number, orders.status, orders.priority, orders.start_date, orders.due_date,
		       orders.notes, orders.created_at
		FROM orders
		LEFT JOIN customers ON orders.customer_id = customers.id
		ORDER BY orders.start_date ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []models.Order = []models.Order{} // 初始化为空数组，避免 null
	for rows.Next() {
		var o models.Order
		var customerID sql.NullInt64
		var customerName, startDate, dueDate, notes sql.NullString
		err := rows.Scan(&o.ID, &customerID, &customerName, &o.OrderNumber, &o.Status, &o.Priority, &startDate, &dueDate, &notes, &o.CreatedAt)
		if err != nil {
			return nil, err
		}
		if customerID.Valid {
			id := int(customerID.Int64)
			o.CustomerID = &id
		}
		o.CustomerName = strPtr(customerName)
		o.StartDate = parseDatePtr(startDate.String)
		o.DueDate = parseDatePtr(dueDate.String)
		o.Notes = strPtr(notes)
		orders = append(orders, o)
	}

	// 获取每个订单的订单项和工序
	itemRepo := NewOrderItemRepository(r.db)
	for i := range orders {
		items, err := itemRepo.GetByOrderID(orders[i].ID)
		if err != nil {
			return nil, err
		}
		orders[i].Items = items
	}

	return orders, nil
}

func (r *OrderRepository) Create(order *models.Order, items []models.OrderItem) (int64, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// 插入订单
	result, err := tx.Exec(
		"INSERT INTO orders (customer_id, customer_name, order_number, priority, start_date, due_date, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		order.CustomerID, order.CustomerName, order.OrderNumber, order.Priority, order.StartDate, order.DueDate, order.Notes, "pending",
	)
	if err != nil {
		return 0, err
	}
	orderID, _ := result.LastInsertId()

	// 插入订单项和工序
	for _, item := range items {
		item.OrderID = int(orderID)
		itemStatus := services.CalculateOrderItemStatus(item.Processes)
		result, err := tx.Exec(
			`INSERT INTO order_items (order_id, part_name, part_number, quantity, scrap_quantity, unit_price, total_price,
			 status, drawing_data, notes, completion_date, start_date, due_date, delivered_quantity,
			 tool_cost, fixture_cost, material_cost, other_cost, item_notes)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			item.OrderID, item.PartName, item.PartNumber, item.Quantity, item.ScrapQuantity, item.UnitPrice, item.TotalPrice,
			itemStatus, item.DrawingData, item.Notes, item.CompletionDate.ToTimePtr(), item.StartDate.ToTimePtr(), item.DueDate.ToTimePtr(), item.DeliveredQty,
			item.ToolCost, item.FixtureCost, item.MaterialCost, item.OtherCost, item.ItemNotes,
		)
		if err != nil {
			return 0, err
		}
		itemID, _ := result.LastInsertId()

		// 插入工序
		for i, p := range item.Processes {
			_, err := tx.Exec(
				"INSERT INTO order_processes (order_item_id, name, is_outsourced, outsourcing_fee, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
				itemID, p.Name, p.IsOutsourced, p.OutsourcingFee, p.Status, i,
			)
			if err != nil {
				return 0, err
			}
		}
	}

	// 计算并更新订单状态
	var statuses []string = []string{}
	for _, item := range items {
		statuses = append(statuses, services.CalculateOrderItemStatus(item.Processes))
	}
	orderStatus := services.CalculateStatus(statuses)
	tx.Exec("UPDATE orders SET status = ? WHERE id = ?", orderStatus, orderID)

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return orderID, nil
}

func (r *OrderRepository) Update(order *models.Order, items []models.OrderItem) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 更新订单
	_, err = tx.Exec(
		"UPDATE orders SET customer_id = ?, customer_name = ?, priority = ?, start_date = ?, due_date = ?, notes = ? WHERE id = ?",
		order.CustomerID, order.CustomerName, order.Priority, order.StartDate, order.DueDate, order.Notes, order.ID,
	)
	if err != nil {
		return err
	}

	if items != nil {
		// 删除旧的订单项和工序
		rows, _ := tx.Query("SELECT id FROM order_items WHERE order_id = ?", order.ID)
	var itemIDs []int = []int{}
		for rows.Next() {
			var id int
			rows.Scan(&id)
			itemIDs = append(itemIDs, id)
		}
		rows.Close()

		for _, id := range itemIDs {
			tx.Exec("DELETE FROM order_processes WHERE order_item_id = ?", id)
		}
		tx.Exec("DELETE FROM order_items WHERE order_id = ?", order.ID)

		// 插入新的订单项和工序
		for _, item := range items {
			item.OrderID = order.ID
			itemStatus := services.CalculateOrderItemStatus(item.Processes)
			result, err := tx.Exec(
				`INSERT INTO order_items (order_id, part_name, part_number, quantity, scrap_quantity, unit_price, total_price,
				 status, drawing_data, notes, completion_date, start_date, due_date, delivered_quantity,
				 tool_cost, fixture_cost, material_cost, other_cost, item_notes)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				item.OrderID, item.PartName, item.PartNumber, item.Quantity, item.ScrapQuantity, item.UnitPrice, item.TotalPrice,
				itemStatus, item.DrawingData, item.Notes, item.CompletionDate.ToTimePtr(), item.StartDate.ToTimePtr(), item.DueDate.ToTimePtr(), item.DeliveredQty,
				item.ToolCost, item.FixtureCost, item.MaterialCost, item.OtherCost, item.ItemNotes,
			)
			if err != nil {
				return err
			}
			itemID, _ := result.LastInsertId()

			for i, p := range item.Processes {
				_, err := tx.Exec(
					"INSERT INTO order_processes (order_item_id, name, is_outsourced, outsourcing_fee, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
					itemID, p.Name, p.IsOutsourced, p.OutsourcingFee, p.Status, i,
				)
				if err != nil {
					return err
				}
			}
		}
	}

	// 重新计算订单状态
	rows, _ := tx.Query("SELECT status FROM order_items WHERE order_id = ?", order.ID)
	var statuses []string = []string{}
	for rows.Next() {
		var s string
		rows.Scan(&s)
		statuses = append(statuses, s)
	}
	rows.Close()

	orderStatus := services.CalculateStatus(statuses)
	tx.Exec("UPDATE orders SET status = ? WHERE id = ?", orderStatus, order.ID)

	return tx.Commit()
}

func (r *OrderRepository) UpdateStatus(id int, status string) error {
	_, err := r.db.Exec("UPDATE orders SET status = ? WHERE id = ?", status, id)
	return err
}

func strPtr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

func parseDatePtr(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

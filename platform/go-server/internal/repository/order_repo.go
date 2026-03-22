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
	// 一次查询获取所有数据
	query := `
		SELECT
			o.id, o.customer_id, COALESCE(o.customer_name, c.name) as customer_name,
			o.order_number, o.status, o.priority, o.start_date, o.due_date,
			o.notes, o.created_at,
			oi.id as item_id, oi.part_name, oi.part_number, oi.quantity, oi.scrap_quantity,
			oi.unit_price, oi.total_price, oi.status as item_status, oi.drawing_data, oi.notes as item_notes_data,
			oi.completion_date, oi.start_date as item_start_date, oi.due_date as item_due_date, oi.delivered_quantity,
			oi.tool_cost, oi.fixture_cost, oi.material_cost, oi.other_cost, oi.item_notes,
			op.id as process_id, op.name as process_name, op.is_outsourced, op.outsourcing_fee,
			op.status as process_status, op.sort_order
		FROM orders o
		LEFT JOIN customers c ON o.customer_id = c.id
		LEFT JOIN order_items oi ON o.id = oi.order_id
		LEFT JOIN order_processes op ON oi.id = op.order_item_id
		ORDER BY o.start_date ASC, oi.due_date ASC, op.sort_order ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orderMap := make(map[int]int) // orderID -> index in orders slice
	itemMap := make(map[int]int)  // itemID -> index in items slice of its order
	var orders []models.Order

	for rows.Next() {
		var (
			orderID, orderItemID, processID                                    sql.NullInt64
			customerID                                                         sql.NullInt64
			customerName, orderNumber, orderStatus, priority                   sql.NullString
			orderStartDateRaw, orderDueDateRaw                                 sql.NullTime
			orderNotes                                                         sql.NullString
			createdAt                                                          time.Time
			partName, partNumber                                               sql.NullString
			quantity, scrapQuantity                                            sql.NullInt64
			unitPrice, totalPrice                                              sql.NullFloat64
			itemStatus, drawingData, itemNotesData                             sql.NullString
			completionDateRaw, itemStartDateRaw, itemDueDateRaw                sql.NullTime
			deliveredQty                                                       sql.NullInt64
			toolCost, fixtureCost, materialCost, otherCost                     sql.NullFloat64
			itemNotes                                                          sql.NullString
			processName                                                        sql.NullString
			isOutsourced                                                       sql.NullInt64
			outsourcingFee                                                     sql.NullFloat64
			processStatus                                                      sql.NullString
			sortOrder                                                          sql.NullInt64
		)

		err := rows.Scan(
			&orderID, &customerID, &customerName, &orderNumber, &orderStatus, &priority,
			&orderStartDateRaw, &orderDueDateRaw, &orderNotes, &createdAt,
			&orderItemID, &partName, &partNumber, &quantity, &scrapQuantity,
			&unitPrice, &totalPrice, &itemStatus, &drawingData, &itemNotesData,
			&completionDateRaw, &itemStartDateRaw, &itemDueDateRaw, &deliveredQty,
			&toolCost, &fixtureCost, &materialCost, &otherCost, &itemNotes,
			&processID, &processName, &isOutsourced, &outsourcingFee,
			&processStatus, &sortOrder,
		)
		if err != nil {
			return nil, err
		}

		if !orderID.Valid {
			continue
		}

		oid := int(orderID.Int64)

		// 添加或获取订单
		orderIdx, orderExists := orderMap[oid]
		if !orderExists {
			order := models.Order{
				ID:          oid,
				OrderNumber: orderNumber.String,
				Status:      models.OrderStatus(orderStatus.String),
				Priority:    models.Priority(priority.String),
				CreatedAt:   createdAt,
				Items:       []models.OrderItem{},
			}
			if customerID.Valid {
				cid := int(customerID.Int64)
				order.CustomerID = &cid
			}
			order.CustomerName = strPtr(customerName)
			if orderStartDateRaw.Valid {
				order.StartDate = &orderStartDateRaw.Time
			}
			if orderDueDateRaw.Valid {
				order.DueDate = &orderDueDateRaw.Time
			}
			order.Notes = strPtr(orderNotes)
			orderMap[oid] = len(orders)
			orders = append(orders, order)
			orderIdx = len(orders) - 1
		}

		// 添加或获取订单项
		if orderItemID.Valid {
			iid := int(orderItemID.Int64)
			itemIdx, itemExists := itemMap[iid]
			if !itemExists {
				item := models.OrderItem{
					ID:            iid,
					OrderID:       oid,
					PartName:      partName.String,
					Quantity:      int(quantity.Int64),
					UnitPrice:     unitPrice.Float64,
					TotalPrice:    totalPrice.Float64,
					Status:        models.OrderStatus(itemStatus.String),
					Processes:     []models.OrderProcess{},
				}
				if partNumber.Valid {
					item.PartNumber = models.NullString{NullString: sql.NullString{Valid: true, String: partNumber.String}}
				}
				if scrapQuantity.Valid {
					item.ScrapQuantity = int(scrapQuantity.Int64)
				}
				if drawingData.Valid {
					item.DrawingData = models.NullString{NullString: sql.NullString{Valid: true, String: drawingData.String}}
				}
				if deliveredQty.Valid {
					item.DeliveredQty = models.NullInt64{NullInt64: sql.NullInt64{Valid: true, Int64: deliveredQty.Int64}}
				}
				if toolCost.Valid {
					item.ToolCost = models.NullFloat64{NullFloat64: sql.NullFloat64{Valid: true, Float64: toolCost.Float64}}
				}
				if fixtureCost.Valid {
					item.FixtureCost = models.NullFloat64{NullFloat64: sql.NullFloat64{Valid: true, Float64: fixtureCost.Float64}}
				}
				if materialCost.Valid {
					item.MaterialCost = models.NullFloat64{NullFloat64: sql.NullFloat64{Valid: true, Float64: materialCost.Float64}}
				}
				if otherCost.Valid {
					item.OtherCost = models.NullFloat64{NullFloat64: sql.NullFloat64{Valid: true, Float64: otherCost.Float64}}
				}
				if itemNotes.Valid {
					item.ItemNotes = models.NullString{NullString: sql.NullString{Valid: true, String: itemNotes.String}}
				}
				// 订单项日期
				if itemStartDateRaw.Valid {
					item.StartDate = models.Date{Time: itemStartDateRaw.Time, Valid: true}
				}
				if itemDueDateRaw.Valid {
					item.DueDate = models.Date{Time: itemDueDateRaw.Time, Valid: true}
				}
				if completionDateRaw.Valid {
					item.CompletionDate = models.Date{Time: completionDateRaw.Time, Valid: true}
				}
				itemMap[iid] = len(orders[orderIdx].Items)
				orders[orderIdx].Items = append(orders[orderIdx].Items, item)
				itemIdx = len(orders[orderIdx].Items) - 1
			}

			// 添加工序
			if processID.Valid {
				process := models.OrderProcess{
					ID:             int(processID.Int64),
					OrderItemID:    int(orderItemID.Int64),
					Name:           processName.String,
					IsOutsourced:   isOutsourced.Int64 == 1,
					OutsourcingFee: outsourcingFee.Float64,
					Status:         models.ProcessStatus(processStatus.String),
					SortOrder:      int(sortOrder.Int64),
				}
				orders[orderIdx].Items[itemIdx].Processes = append(orders[orderIdx].Items[itemIdx].Processes, process)
			}
		}
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

func (r *OrderRepository) Delete(id int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 获取订单项ID
	rows, err := tx.Query("SELECT id FROM order_items WHERE order_id = ?", id)
	if err != nil {
		return err
	}
	var itemIDs []int
	for rows.Next() {
		var itemID int
		if err := rows.Scan(&itemID); err != nil {
			rows.Close()
			return err
		}
		itemIDs = append(itemIDs, itemID)
	}
	rows.Close()

	// 删除工序
	for _, itemID := range itemIDs {
		if _, err := tx.Exec("DELETE FROM order_processes WHERE order_item_id = ?", itemID); err != nil {
			return err
		}
	}

	// 删除订单项
	if _, err := tx.Exec("DELETE FROM order_items WHERE order_id = ?", id); err != nil {
		return err
	}

	// 删除订单
	if _, err := tx.Exec("DELETE FROM orders WHERE id = ?", id); err != nil {
		return err
	}

	return tx.Commit()
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

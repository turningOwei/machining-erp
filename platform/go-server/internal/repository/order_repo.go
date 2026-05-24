package repository

import (
	"fmt"
	"time"

	"machining-erp/internal/models"
	"machining-erp/pkg/utils"

	"gorm.io/gorm"
)

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// OrderFilters 订单筛选条件
type OrderFilters struct {
	CorpID       int64
	DueDateStart string
	DueDateEnd   string
	OrderNumber  string
	PartNumber   string
	PartName     string
	CustomerName string
	Priority     string
	Status       string
	Page         int
	PageSize     int
	DateType     string // "overdue" 逾期, "warning" 告警, "near_due" 临期
}

// OrderListResult 订单列表返回结果
type OrderListResult struct {
	Orders []models.Order
	Total  int64
}

func (r *OrderRepository) GetWithFilters(filters OrderFilters) (OrderListResult, error) {
	startTime := time.Now()

	// 1. 构建基础查询
	baseQuery := r.db.Model(&models.Order{})

	// 按 corpID 过滤
	if filters.CorpID > 0 {
		baseQuery = baseQuery.Where("corp_id = ?", filters.CorpID)
	}

	// 应用订单级别筛选
	if filters.Status != "" {
		baseQuery = baseQuery.Where("status = ?", filters.Status)
	}
	if filters.OrderNumber != "" {
		baseQuery = baseQuery.Where("order_number LIKE ?", "%"+filters.OrderNumber+"%")
	}
	if filters.CustomerName != "" {
		baseQuery = baseQuery.Where("customer_name LIKE ? OR customer_short_name LIKE ?",
			"%"+filters.CustomerName+"%", "%"+filters.CustomerName+"%")
	}
	if filters.Priority != "" {
		baseQuery = baseQuery.Where("priority = ?", filters.Priority)
	}

	// 根据期限类型筛选
	today := time.Now().Format("2006-01-02")

	if filters.DateType != "" {
		// 排除已完成的订单
		baseQuery = baseQuery.Where("status NOT IN ?", []string{"delivered", "completed"})

		subQuery := r.db.Model(&models.OrderItem{}).Select("DISTINCT order_id")

		switch filters.DateType {
		case "overdue":
			// 逾期：零件交期 < 今天
			subQuery = subQuery.Where("due_date IS NOT NULL AND due_date < ?", today)
		case "near_due":
			// 临期：根据规则表筛选
			orderIDs := r.getOrderIDsByRuleType(0, "imminent")
			if len(orderIDs) > 0 {
				subQuery = r.db.Model(&models.Order{}).Select("id").Where("id IN ?", orderIDs)
			} else {
				// 无规则时返回空结果
				subQuery = r.db.Model(&models.Order{}).Select("id").Where("1 = 0")
			}
		case "warning":
			// 告警：根据规则表筛选
			orderIDs := r.getOrderIDsByRuleType(0, "warning")
			if len(orderIDs) > 0 {
				subQuery = r.db.Model(&models.Order{}).Select("id").Where("id IN ?", orderIDs)
			} else {
				// 无规则时返回空结果
				subQuery = r.db.Model(&models.Order{}).Select("id").Where("1 = 0")
			}
		}
		baseQuery = baseQuery.Where("id IN (?)", subQuery)
	}

	// 如果有零件级别筛选，需要子查询
	if filters.DueDateStart != "" || filters.DueDateEnd != "" || filters.PartNumber != "" || filters.PartName != "" {
		subQuery := r.db.Model(&models.OrderItem{}).Select("DISTINCT order_id")
		if filters.DueDateStart != "" {
			subQuery = subQuery.Where("due_date >= ?", filters.DueDateStart)
		}
		if filters.DueDateEnd != "" {
			subQuery = subQuery.Where("due_date <= ?", filters.DueDateEnd)
		}
		if filters.PartNumber != "" {
			subQuery = subQuery.Where("part_number LIKE ?", "%"+filters.PartNumber+"%")
		}
		if filters.PartName != "" {
			subQuery = subQuery.Where("part_name LIKE ?", "%"+filters.PartName+"%")
		}
		baseQuery = baseQuery.Where("id IN (?)", subQuery)
	}

	// 2. 先计算总数
	var total int64
	t1 := time.Now()
	if err := baseQuery.Count(&total).Error; err != nil {
		return OrderListResult{}, err
	}
	fmt.Printf("[OrderRepo] Count query took %v ms, total=%d\n", time.Since(t1).Milliseconds(), total)

	if total == 0 {
		return OrderListResult{Orders: []models.Order{}, Total: 0}, nil
	}

	// 3. 查询订单列表（分页+排序）
	var orders []models.Order
	orderQuery := r.db.Model(&models.Order{})
	// 复制baseQuery的条件
	if filters.CorpID > 0 {
		orderQuery = orderQuery.Where("corp_id = ?", filters.CorpID)
	}
	if filters.Status != "" {
		orderQuery = orderQuery.Where("status = ?", filters.Status)
	}
	if filters.OrderNumber != "" {
		orderQuery = orderQuery.Where("order_number LIKE ?", "%"+filters.OrderNumber+"%")
	}
	if filters.CustomerName != "" {
		orderQuery = orderQuery.Where("customer_name LIKE ? OR customer_short_name LIKE ?",
			"%"+filters.CustomerName+"%", "%"+filters.CustomerName+"%")
	}
	if filters.Priority != "" {
		orderQuery = orderQuery.Where("priority = ?", filters.Priority)
	}
	if filters.DateType != "" {
		orderQuery = orderQuery.Where("status NOT IN ?", []string{"delivered", "completed"})
		switch filters.DateType {
		case "overdue":
			subQuery := r.db.Model(&models.OrderItem{}).Select("DISTINCT order_id").Where("due_date IS NOT NULL AND due_date < ?", today)
			orderQuery = orderQuery.Where("id IN (?)", subQuery)
		case "near_due":
			ids := r.getOrderIDsByRuleType(0, "imminent")
			if len(ids) > 0 {
				orderQuery = orderQuery.Where("id IN ?", ids)
			} else {
				orderQuery = orderQuery.Where("1 = 0")
			}
		case "warning":
			ids := r.getOrderIDsByRuleType(0, "warning")
			if len(ids) > 0 {
				orderQuery = orderQuery.Where("id IN ?", ids)
			} else {
				orderQuery = orderQuery.Where("1 = 0")
			}
		}
	}
	if filters.DueDateStart != "" || filters.DueDateEnd != "" || filters.PartNumber != "" || filters.PartName != "" {
		subQuery := r.db.Model(&models.OrderItem{}).Select("DISTINCT order_id")
		if filters.DueDateStart != "" {
			subQuery = subQuery.Where("due_date >= ?", filters.DueDateStart)
		}
		if filters.DueDateEnd != "" {
			subQuery = subQuery.Where("due_date <= ?", filters.DueDateEnd)
		}
		if filters.PartNumber != "" {
			subQuery = subQuery.Where("part_number LIKE ?", "%"+filters.PartNumber+"%")
		}
		if filters.PartName != "" {
			subQuery = subQuery.Where("part_name LIKE ?", "%"+filters.PartName+"%")
		}
		orderQuery = orderQuery.Where("id IN (?)", subQuery)
	}

	// 排序和分页
	orderQuery = orderQuery.Order("start_date DESC")
	if filters.PageSize > 0 {
		offset := 0
		if filters.Page > 1 {
			offset = (filters.Page - 1) * filters.PageSize
		}
		orderQuery = orderQuery.Limit(filters.PageSize).Offset(offset)
	}

	t2 := time.Now()
	if err := orderQuery.Find(&orders).Error; err != nil {
		return OrderListResult{}, err
	}
	fmt.Printf("[OrderRepo] Orders query took %v ms, count=%d\n", time.Since(t2).Milliseconds(), len(orders))

	if len(orders) == 0 {
		return OrderListResult{Orders: []models.Order{}, Total: total}, nil
	}

	// 收集订单ID
	orderIDs := make([]int64, len(orders))
	for i, o := range orders {
		orderIDs[i] = o.ID
	}

	// 4. 查询零件信息
	var items []models.OrderItem
	if err := r.db.Where("order_id IN ?", orderIDs).Order("due_date ASC, id ASC").Find(&items).Error; err != nil {
		return OrderListResult{}, err
	}

	// 收集零件ID
	itemIDs := make([]int64, len(items))
	for i, it := range items {
		itemIDs[i] = it.ID
	}

	// 5. 查询工序信息
	var processes []models.OrderProcess
	if len(itemIDs) > 0 {
		if err := r.db.Where("order_item_id IN ?", itemIDs).Order("sort_order ASC").Find(&processes).Error; err != nil {
			return OrderListResult{}, err
		}
	}

	// 6. 组装数据
	// 构建工序映射
	processMap := make(map[int64][]models.OrderProcess)
	for _, p := range processes {
		processMap[p.OrderItemID] = append(processMap[p.OrderItemID], p)
	}

	// 构建零件映射
	itemMap := make(map[int64][]models.OrderItem)
	for _, it := range items {
		it.Processes = processMap[it.ID]
		itemMap[it.OrderID] = append(itemMap[it.OrderID], it)
	}

	// 组装订单
	for i := range orders {
		orders[i].Items = itemMap[orders[i].ID]
	}

	fmt.Printf("[OrderRepo] GetWithFilters total took %v ms\n", time.Since(startTime).Milliseconds())
	return OrderListResult{Orders: orders, Total: total}, nil
}

func (r *OrderRepository) GetAllWithItems() ([]models.Order, error) {
	result, err := r.GetWithFilters(OrderFilters{})
	if err != nil {
		return nil, err
	}
	return result.Orders, nil
}

func (r *OrderRepository) Create(order *models.Order, items []models.OrderItem) (int64, error) {
	err := r.db.Transaction(func(tx *gorm.DB) error {
		// 计算每个订单项的状态
		for i := range items {
			items[i].Status = models.OrderStatus(utils.CalculateOrderItemStatus(items[i].Processes))
		}

		// 插入订单
		if err := tx.Create(order).Error; err != nil {
			return err
		}

		// 插入订单项
		for i := range items {
			items[i].OrderID = order.ID
			// 先保存工序，然后清空避免 GORM 自动插入关联
			processes := items[i].Processes
			items[i].Processes = nil
			if err := tx.Create(&items[i]).Error; err != nil {
				return err
			}

			// 插入工序
			for j := range processes {
				processes[j].OrderItemID = items[i].ID
				processes[j].SortOrder = j
				if err := tx.Create(&processes[j]).Error; err != nil {
					return err
				}
			}
			items[i].Processes = processes
		}

		// 计算订单状态
		var statuses []string
		for _, item := range items {
			statuses = append(statuses, string(item.Status))
		}
		order.Status = models.OrderStatus(utils.CalculateStatus(statuses))
		tx.Model(order).Updates(map[string]interface{}{"status": order.Status, "total_amount": order.TotalAmount})

		return nil
	})

	if err != nil {
		return 0, err
	}
	return int64(order.ID), nil
}

// handleProcesses 处理已存在订单项的工序更新逻辑
func handleProcesses(tx *gorm.DB, itemID int64, processes []models.OrderProcess) error {
	// 获取旧的工序ID
	var oldProcessIDs []int64
	tx.Model(&models.OrderProcess{}).Where("order_item_id = ?", itemID).Pluck("id", &oldProcessIDs)

	// 收集前端传来的工序ID
	newProcessIDs := make(map[int64]bool)
	for _, p := range processes {
		if p.ID != 0 {
			newProcessIDs[p.ID] = true
		}
	}

	// 删除不再存在的工序
	for _, oldPID := range oldProcessIDs {
		if !newProcessIDs[oldPID] {
			tx.Delete(&models.OrderProcess{}, oldPID)
		}
	}

	// 更新或插入工序
	for j := range processes {
		processes[j].OrderItemID = itemID
		processes[j].SortOrder = j

		if processes[j].ID != 0 {
			// 有ID，执行更新
			if err := tx.Model(&models.OrderProcess{}).Where("id = ? AND order_item_id = ?", processes[j].ID, itemID).Updates(map[string]interface{}{
				"name":            processes[j].Name,
				"is_outsourced":   processes[j].IsOutsourced,
				"outsourcing_fee": processes[j].OutsourcingFee,
				"status":          processes[j].Status,
				"sort_order":      j,
			}).Error; err != nil {
				return err
			}
		} else {
			// 没有ID，插入新工序
			if err := tx.Create(&processes[j]).Error; err != nil {
				return err
			}
		}
	}

	return nil
}

func (r *OrderRepository) Update(order *models.Order, items []models.OrderItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 更新订单基本信息
		if err := tx.Model(order).Updates(map[string]interface{}{
			"customer_id":         order.CustomerID,
			"customer_name":       order.CustomerName,
			"customer_short_name": order.CustomerShortName,
			"order_number":        order.OrderNumber,
			"order_name":          order.OrderName,
			"contact_name":        order.ContactName,
			"priority":            order.Priority,
			"start_date":          order.StartDate,
			"due_date":            order.DueDate,
			"notes":               order.Notes,
		}).Error; err != nil {
			return err
		}

		if items != nil {
			// 获取旧的订单项ID
			var oldItemIDs []int64
			tx.Model(&models.OrderItem{}).Where("order_id = ?", order.ID).Pluck("id", &oldItemIDs)

			// 收集前端传来的订单项ID
			newItemIDs := make(map[int64]bool)
			for _, item := range items {
				if item.ID != 0 {
					newItemIDs[item.ID] = true
				}
			}

			// 删除不再存在的订单项和其工序
			for _, oldID := range oldItemIDs {
				if !newItemIDs[oldID] {
					tx.Delete(&models.OrderProcess{}, "order_item_id = ?", oldID)
					tx.Delete(&models.OrderItem{}, oldID)
				}
			}

			// 更新或插入订单项和工序
			for i := range items {
				items[i].OrderID = order.ID
				items[i].Status = models.OrderStatus(utils.CalculateOrderItemStatus(items[i].Processes))

				if items[i].ID != 0 {
					// 更新已存在的订单项
					updateFields := map[string]interface{}{
						"part_name":          items[i].PartName,
						"part_number":        items[i].PartNumber,
						"quantity":           items[i].Quantity,
						"scrap_quantity":     items[i].ScrapQuantity,
						"status":             items[i].Status,
						"drawing_data":       items[i].DrawingData,
						"notes":              items[i].Notes,
						"start_date":         items[i].StartDate,
						"due_date":           items[i].DueDate,
						"delivered_quantity": items[i].DeliveredQty,
						"item_notes":         items[i].ItemNotes,
						"completion_date":    items[i].CompletionDate,
					}
					// 只有当费用字段有值时才更新（避免清空原有值）
					if items[i].UnitPrice != 0 {
						updateFields["unit_price"] = items[i].UnitPrice
					}
					if items[i].TotalPrice != 0 {
						updateFields["total_price"] = items[i].TotalPrice
					}
					if items[i].ToolCost != nil && *items[i].ToolCost != 0 {
						updateFields["tool_cost"] = items[i].ToolCost
					}
					if items[i].FixtureCost != nil && *items[i].FixtureCost != 0 {
						updateFields["fixture_cost"] = items[i].FixtureCost
					}
					if items[i].MaterialCost != nil && *items[i].MaterialCost != 0 {
						updateFields["material_cost"] = items[i].MaterialCost
					}
					if items[i].OtherCost != nil && *items[i].OtherCost != 0 {
						updateFields["other_cost"] = items[i].OtherCost
					}
					if err := tx.Model(&items[i]).Updates(updateFields).Error; err != nil {
						return err
					}

					// 处理已存在订单项的工序
					if err := handleProcesses(tx, items[i].ID, items[i].Processes); err != nil {
						return err
					}
				} else {
					// 插入新的订单项：清空所有工序ID，确保全新插入
					for j := range items[i].Processes {
						items[i].Processes[j].ID = 0
						items[i].Processes[j].OrderItemID = 0
					}
					if err := tx.Create(&items[i]).Error; err != nil {
						return err
					}

					// 插入工序（此时items[i].ID已赋值）
					for j := range items[i].Processes {
						items[i].Processes[j].OrderItemID = items[i].ID
						items[i].Processes[j].SortOrder = j
						if err := tx.Omit("id").Create(&items[i].Processes[j]).Error; err != nil {
							return err
						}
					}
				}
			}
		}

		// 重新计算订单状态
		var statuses []string
		tx.Model(&models.OrderItem{}).Where("order_id = ?", order.ID).Pluck("status", &statuses)
		order.Status = models.OrderStatus(utils.CalculateStatus(statuses))
		tx.Model(order).Updates(map[string]interface{}{"status": order.Status, "total_amount": order.TotalAmount})

		return nil
	})
}

func (r *OrderRepository) UpdateStatus(id int64, status string) error {
	return r.db.Model(&models.Order{}).Where("id = ?", id).Update("status", status).Error
}

func (r *OrderRepository) Delete(id int64) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var itemIDs []int
		tx.Model(&models.OrderItem{}).Where("order_id = ?", id).Pluck("id", &itemIDs)
		if len(itemIDs) > 0 {
			tx.Delete(&models.OrderProcess{}, "order_item_id IN ?", itemIDs)
		}
		tx.Delete(&models.OrderItem{}, "order_id = ?", id)
		tx.Delete(&models.Order{}, id)
		return nil
	})
}

// GetByID 根据订单ID获取完整订单信息（包含零件和工序）
func (r *OrderRepository) GetByID(orderID int64) (*models.Order, error) {
	var order models.Order
	if err := r.db.First(&order, orderID).Error; err != nil {
		return nil, err
	}

	// 查询零件信息
	var items []models.OrderItem
	if err := r.db.Where("order_id = ?", orderID).Order("id ASC").Find(&items).Error; err != nil {
		return nil, err
	}

	// 收集零件ID
	itemIDs := make([]int64, len(items))
	for i, it := range items {
		itemIDs[i] = it.ID
	}

	// 查询工序信息
	var processes []models.OrderProcess
	if len(itemIDs) > 0 {
		if err := r.db.Where("order_item_id IN ?", itemIDs).Order("sort_order ASC").Find(&processes).Error; err != nil {
			return nil, err
		}
	}

	// 构建工序映射
	processMap := make(map[int64][]models.OrderProcess)
	for _, p := range processes {
		processMap[p.OrderItemID] = append(processMap[p.OrderItemID], p)
	}

	// 组装零件的工序
	for i := range items {
		items[i].Processes = processMap[items[i].ID]
	}

	order.Items = items
	return &order, nil
}

// DashboardItem 工作看板零件数据
type DashboardItem struct {
	OrderID           int64                 `json:"order_id"`
	OrderNumber       string                `json:"order_number"`
	CustomerShortName string                `json:"customer_short_name"`
	Priority          string                `json:"priority"`
	ItemID            int64                 `json:"item_id"`
	PartName          string                `json:"part_name"`
	PartNumber        string                `json:"part_number"`
	Quantity          int                   `json:"quantity"`
	Status            string                `json:"status"`
	StartDate         *time.Time            `json:"start_date"`
	DueDate           *time.Time            `json:"due_date"`
	DrawingData       string                `json:"drawing_data"`
	Processes         []models.OrderProcess `json:"processes"`
}

// DashboardResult 工作看板返回结果
type DashboardResult struct {
	Items    []DashboardItem `json:"items"`
	Orders   []OrderInfo     `json:"orders"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"pageSize"`
}

// OrderInfo 订单简要信息
type OrderInfo struct {
	ID                int64  `json:"id"`
	OrderNumber       string `json:"order_number"`
	CustomerName      string `json:"customer_name"`
	CustomerShortName string `json:"customer_short_name"`
	Status            string `json:"status"`
	Priority          string `json:"priority"`
}

// DashboardStats 看板卡片统计数据
type DashboardStats struct {
	PendingCount    int64 `json:"pending_count"`
	ProcessingCount int64 `json:"processing_count"`
	CompletedCount  int64 `json:"completed_count"`
	OverdueCount    int64 `json:"overdue_count"`  // 逾期订单
	WarningCount    int64 `json:"warning_count"`  // 告警订单
	NearDueCount    int64 `json:"near_due_count"` // 临期订单
}

// GetDashboardStats 获取看板卡片统计数据
func (r *OrderRepository) GetDashboardStats(corpID int64) (*DashboardStats, error) {
	stats := &DashboardStats{}
	today := time.Now().Format("2006-01-02")

	// 统计各状态的零件数量
	query := r.db.Table("order_items as oi").
		Joins("JOIN orders o ON o.id = oi.order_id").
		Where("oi.status NOT IN ?", []string{"delivered", "completed"})
	if corpID > 0 {
		query = query.Where("o.corp_id = ?", corpID)
	}
	rows, err := query.Select("oi.status, COUNT(*) as count").Group("oi.status").Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int64
		if err := rows.Scan(&status, &count); err != nil {
			continue
		}
		switch status {
		case "pending":
			stats.PendingCount = count
		case "processing":
			stats.ProcessingCount = count
		}
	}

	// 已完成的统计
	completedQuery := r.db.Table("order_items as oi").Joins("JOIN orders o ON o.id = oi.order_id").Where("oi.status = ?", "completed")
	if corpID > 0 {
		completedQuery = completedQuery.Where("o.corp_id = ?", corpID)
	}
	completedQuery.Count(&stats.CompletedCount)

	// 逾期订单：零件交期 < 今天 且订单状态未完成
	overdueQuery := r.db.Table("order_items as oi").
		Joins("JOIN orders o ON o.id = oi.order_id").
		Where("oi.due_date IS NOT NULL AND oi.due_date < ?", today).
		Where("o.status NOT IN ?", []string{"delivered", "completed"})
	if corpID > 0 {
		overdueQuery = overdueQuery.Where("o.corp_id = ?", corpID)
	}
	overdueQuery.Count(&stats.OverdueCount)

	// 告警订单：根据规则统计
	warningIDs := r.getOrderIDsByRuleType(int(corpID), "warning")
	stats.WarningCount = int64(len(warningIDs))

	// 临期订单：根据规则统计
	imminentIDs := r.getOrderIDsByRuleType(int(corpID), "imminent")
	stats.NearDueCount = int64(len(imminentIDs))

	return stats, nil
}

// GetDashboardItems 获取工作看板零件数据（带分页）
func (r *OrderRepository) GetDashboardItems(corpID int64, page, pageSize int) (*DashboardResult, error) {
	if pageSize <= 0 {
		pageSize = 20
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	// 1. 查询总数
	var total int64
	countQuery := r.db.Table("order_items as oi").
		Joins("JOIN orders o ON o.id = oi.order_id").
		Where("oi.status NOT IN ?", []string{"delivered", "completed"})
	if corpID > 0 {
		countQuery = countQuery.Where("o.corp_id = ?", corpID)
	}
	countQuery.Count(&total)

	// 2. 分页查询零件
	var results []struct {
		OrderID           int64
		OrderNumber       string
		CustomerShortName string
		Priority          string
		ItemID            int64
		PartName          string
		PartNumber        string
		Quantity          int
		Status            string
		StartDate         *time.Time
		DueDate           *time.Time
		DrawingData       *string
	}

	dataQuery := r.db.Table("order_items as oi").
		Select(`o.id as order_id, o.order_number,
			COALESCE(o.customer_short_name, '') as customer_short_name,
			o.priority, oi.id as item_id, oi.part_name,
			COALESCE(oi.part_number, '') as part_number,
			oi.quantity, oi.status,
			oi.start_date, oi.due_date,
			COALESCE(oi.drawing_data, '') as drawing_data`).
		Joins("JOIN orders o ON o.id = oi.order_id").
		Where("oi.status NOT IN ?", []string{"delivered", "completed"})
	if corpID > 0 {
		dataQuery = dataQuery.Where("o.corp_id = ?", corpID)
	}
	err := dataQuery.Order("oi.start_date ASC, oi.due_date ASC, oi.status ASC").
		Limit(pageSize).Offset(offset).
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return &DashboardResult{
			Items:    []DashboardItem{},
			Orders:   []OrderInfo{},
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		}, nil
	}

	// 3. 获取订单ID列表，查询订单信息
	orderIDs := make([]int64, 0)
	orderIDSet := make(map[int64]bool)
	for _, r := range results {
		if !orderIDSet[r.OrderID] {
			orderIDs = append(orderIDs, r.OrderID)
			orderIDSet[r.OrderID] = true
		}
	}

	var orderInfos []OrderInfo
	r.db.Table("orders").
		Select("id, order_number, customer_name, customer_short_name, status, priority").
		Where("id IN ?", orderIDs).
		Order("start_date ASC").
		Find(&orderInfos)

	// 4. 批量加载工序
	itemIDs := make([]int64, len(results))
	itemMap := make(map[int64]int)
	for i, r := range results {
		itemIDs[i] = r.ItemID
		itemMap[r.ItemID] = i
	}

	var processes []models.OrderProcess
	err = r.db.Where("order_item_id IN ?", itemIDs).Order("sort_order ASC").Find(&processes).Error
	if err != nil {
		return nil, err
	}

	// 4. 组装数据
	items := make([]DashboardItem, len(results))
	for i, r := range results {
		items[i] = DashboardItem{
			OrderID:           r.OrderID,
			OrderNumber:       r.OrderNumber,
			CustomerShortName: r.CustomerShortName,
			Priority:          r.Priority,
			ItemID:            r.ItemID,
			PartName:          r.PartName,
			PartNumber:        r.PartNumber,
			Quantity:          r.Quantity,
			Status:            r.Status,
			StartDate:         r.StartDate,
			DueDate:           r.DueDate,
		}
		if r.DrawingData != nil {
			items[i].DrawingData = *r.DrawingData
		}
	}

	for _, p := range processes {
		if idx, ok := itemMap[p.OrderItemID]; ok {
			items[idx].Processes = append(items[idx].Processes, p)
		}
	}

	return &DashboardResult{
		Items:    items,
		Orders:   orderInfos,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// getOrderIDsByRuleType 根据规则类型获取符合条件的订单ID列表（使用SQL）
func (r *OrderRepository) getOrderIDsByRuleType(corpID int, ruleType string) []int64 {
	// 1. 获取规则列表
	var rules []models.AdventRule
	r.db.Where("corp_id = ? AND ruleType = ?", corpID, ruleType).Find(&rules)

	if len(rules) == 0 {
		return nil
	}

	// 2. 提取公式列表
	var formulas []string
	for _, rule := range rules {
		formulas = append(formulas, rule.Formula)
	}

	// 3. 使用SQL转换器构建查询
	converter := utils.NewRuleSQLConverter()
	sql := converter.BuildRuleBasedQuery(corpID, ruleType, formulas)

	// 4. 执行查询
	var orderIDs []int64
	r.db.Raw(sql).Pluck("id", &orderIDs)

	return orderIDs
}

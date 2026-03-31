package repository

import (
	"time"

	"gorm.io/gorm"
	"machining-erp/internal/models"
	"machining-erp/pkg/utils"
)

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// OrderFilters 订单筛选条件
type OrderFilters struct {
	DueDateStart string
	DueDateEnd   string
	OrderNumber  string
	PartNumber   string
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
	// 1. 构建基础查询
	baseQuery := r.db.Model(&models.Order{})

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
	if filters.DueDateStart != "" || filters.DueDateEnd != "" || filters.PartNumber != "" {
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
		baseQuery = baseQuery.Where("id IN (?)", subQuery)
	}

	// 2. 先计算总数
	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return OrderListResult{}, err
	}

	if total == 0 {
		return OrderListResult{Orders: []models.Order{}, Total: 0}, nil
	}

	// 3. 分页查询订单ID
	idQuery := baseQuery.Order("start_date ASC")
	if filters.PageSize > 0 {
		offset := 0
		if filters.Page > 1 {
			offset = (filters.Page - 1) * filters.PageSize
		}
		idQuery = idQuery.Limit(filters.PageSize).Offset(offset)
	}

	var orderIDs []int
	if err := idQuery.Pluck("id", &orderIDs).Error; err != nil {
		return OrderListResult{}, err
	}

	if len(orderIDs) == 0 {
		return OrderListResult{Orders: []models.Order{}, Total: total}, nil
	}

	// 2. 用JOIN查询这些订单的完整数据
	joinQuery := r.db.Table("orders as o").
		Select(`o.id, o.corp_id, o.customer_id, o.customer_name, o.customer_short_name,
			o.order_number, o.order_name, o.contact_id, o.contact_name,
			o.status, o.priority, o.start_date, o.due_date, o.notes, o.created_at,
			oi.id as item_id, oi.corp_id as item_corp_id, oi.part_name, oi.part_number,
			oi.quantity, oi.scrap_quantity, oi.unit_price, oi.total_price,
			oi.status as item_status, oi.drawing_data, oi.notes as item_notes,
			oi.completion_date, oi.start_date as item_start_date, oi.due_date as item_due_date,
			oi.delivered_quantity, oi.tool_cost, oi.fixture_cost, oi.material_cost,
			oi.other_cost, oi.item_notes,
			op.id as process_id, op.order_item_id as process_item_id, op.corp_id as process_corp_id,
			op.name as process_name, op.is_outsourced, op.outsourcing_fee,
			op.status as process_status, op.sort_order`).
		Joins("LEFT JOIN order_items oi ON oi.order_id = o.id").
		Joins("LEFT JOIN order_processes op ON op.order_item_id = oi.id").
		Where("o.id IN ?", orderIDs).
		Order("o.start_date ASC, oi.due_date ASC, op.sort_order ASC")

	var rows []struct {
		// Order fields
		ID                int64
		CorpID            int64
		CustomerID        *int64
		CustomerName      *string
		CustomerShortName *string
		OrderNumber       string
		OrderName         *string
		ContactID         *int64
		ContactName       *string
		Status            string
		Priority          string
		StartDate         *time.Time
		DueDate           *time.Time
		Notes             *string
		CreatedAt         time.Time
		// OrderItem fields
		ItemID            *int64
		ItemCorpID        *int64
		PartName          *string
		PartNumber        *string
		Quantity          *int
		ScrapQuantity     *int
		UnitPrice         *float64
		TotalPrice        *float64
		ItemStatus        *string
		DrawingData       *string
		ItemNotes         *string
		CompletionDate    *time.Time
		ItemStartDate     *time.Time
		ItemDueDate       *time.Time
		DeliveredQuantity *int
		ToolCost          *float64
		FixtureCost       *float64
		MaterialCost      *float64
		OtherCost         *float64
		ItemNotes2        *string // item_notes from items table
		// OrderProcess fields
		ProcessID         *int64
		ProcessItemID     *int64
		ProcessCorpID     *int64
		ProcessName       *string
		IsOutsourced      *bool
		OutsourcingFee    *float64
		ProcessStatus     *string
		SortOrder         *int
	}

	if err := joinQuery.Find(&rows).Error; err != nil {
		return OrderListResult{}, err
	}

	// 4. 组装订单和订单项数据
	orderMap := make(map[int64]*models.Order)
	itemMap := make(map[int64]*models.OrderItem)

	for _, row := range rows {
		// 组装订单
		if _, exists := orderMap[row.ID]; !exists {
			orderMap[row.ID] = &models.Order{
				ID:                row.ID,
				CorpID:            row.CorpID,
				CustomerID:        row.CustomerID,
				CustomerName:      row.CustomerName,
				CustomerShortName: row.CustomerShortName,
				OrderNumber:       row.OrderNumber,
				OrderName:         row.OrderName,
				ContactID:         row.ContactID,
				ContactName:       row.ContactName,
				Status:            models.OrderStatus(row.Status),
				Priority:          models.Priority(row.Priority),
				StartDate:         row.StartDate,
				DueDate:           row.DueDate,
				Notes:             row.Notes,
				CreatedAt:         row.CreatedAt,
				Items:             []models.OrderItem{},
			}
		}

		// 组装订单项
		if row.ItemID != nil {
			if _, exists := itemMap[*row.ItemID]; !exists {
				item := &models.OrderItem{
					ID:             *row.ItemID,
					OrderID:        row.ID,
					CorpID:         *row.ItemCorpID,
					PartName:       *row.PartName,
					PartNumber:     row.PartNumber,
					Quantity:       *row.Quantity,
					ScrapQuantity:  *row.ScrapQuantity,
					UnitPrice:      *row.UnitPrice,
					TotalPrice:     *row.TotalPrice,
					Status:         models.OrderStatus(*row.ItemStatus),
					DrawingData:    row.DrawingData,
					Notes:          row.ItemNotes,
					CompletionDate: row.CompletionDate,
					StartDate:      row.ItemStartDate,
					DueDate:        row.ItemDueDate,
					DeliveredQty:   row.DeliveredQuantity,
					ToolCost:       row.ToolCost,
					FixtureCost:    row.FixtureCost,
					MaterialCost:   row.MaterialCost,
					OtherCost:      row.OtherCost,
					ItemNotes:      row.ItemNotes2,
					Processes:      []models.OrderProcess{},
				}
				itemMap[*row.ItemID] = item
				orderMap[row.ID].Items = append(orderMap[row.ID].Items, *item)
			}
		}
	}

	// 5. 单独查询工序并组装
	itemIDs := make([]int64, 0)
	for id := range itemMap {
		itemIDs = append(itemIDs, id)
	}

	if len(itemIDs) > 0 {
		var processes []models.OrderProcess
		err := r.db.Where("order_item_id IN ?", itemIDs).Order("sort_order ASC").Find(&processes).Error
		if err != nil {
			return OrderListResult{}, err
		}

		// 将工序添加到对应的 order.Items 中（直接修改 order.Items）
		for _, p := range processes {
			for _, order := range orderMap {
				for i := range order.Items {
					if order.Items[i].ID == p.OrderItemID {
						order.Items[i].Processes = append(order.Items[i].Processes, p)
					}
				}
			}
		}
	}

	// 转换为数组
	orders := make([]models.Order, 0, len(orderMap))
	for _, order := range orderMap {
		orders = append(orders, *order)
	}

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
			if err := tx.Create(&items[i]).Error; err != nil {
				return err
			}

			// 插入工序
			for j, p := range items[i].Processes {
				p.OrderItemID = items[i].ID
				p.SortOrder = j
				if err := tx.Create(&p).Error; err != nil {
					return err
				}
			}
			items[i].Processes = nil // 清空，避免返回重复数据
		}

		// 计算订单状态
		var statuses []string
		for _, item := range items {
			statuses = append(statuses, string(item.Status))
		}
		order.Status = models.OrderStatus(utils.CalculateStatus(statuses))
		tx.Model(order).Update("status", order.Status)

		return nil
	})

	if err != nil {
		return 0, err
	}
	return int64(order.ID), nil
}

func (r *OrderRepository) Update(order *models.Order, items []models.OrderItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 更新订单基本信息
		if err := tx.Model(order).Updates(map[string]interface{}{
			"customer_id":        order.CustomerID,
			"customer_name":      order.CustomerName,
			"customer_short_name": order.CustomerShortName,
			"order_name":         order.OrderName,
			"contact_id":         order.ContactID,
			"priority":           order.Priority,
			"start_date":         order.StartDate,
			"due_date":           order.DueDate,
			"notes":              order.Notes,
		}).Error; err != nil {
			return err
		}

		if items != nil {
			// 删除旧的工序和订单项
			var oldItemIDs []int
			tx.Model(&models.OrderItem{}).Where("order_id = ?", order.ID).Pluck("id", &oldItemIDs)
			if len(oldItemIDs) > 0 {
				tx.Delete(&models.OrderProcess{}, "order_item_id IN ?", oldItemIDs)
			}
			tx.Delete(&models.OrderItem{}, "order_id = ?", order.ID)

			// 插入新的订单项和工序
			for i := range items {
				items[i].OrderID = order.ID
				items[i].Status = models.OrderStatus(utils.CalculateOrderItemStatus(items[i].Processes))
				if err := tx.Create(&items[i]).Error; err != nil {
					return err
				}

				for j, p := range items[i].Processes {
					p.OrderItemID = items[i].ID
					p.SortOrder = j
					if err := tx.Create(&p).Error; err != nil {
						return err
					}
				}
			}
		}

		// 重新计算订单状态
		var statuses []string
		tx.Model(&models.OrderItem{}).Where("order_id = ?", order.ID).Pluck("status", &statuses)
		order.Status = models.OrderStatus(utils.CalculateStatus(statuses))
		tx.Model(order).Update("status", order.Status)

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

// DashboardItem 工作看板零件数据
type DashboardItem struct {
	OrderID           int64                  `json:"order_id"`
	OrderNumber       string                 `json:"order_number"`
	CustomerShortName string                 `json:"customer_short_name"`
	Priority          string                 `json:"priority"`
	ItemID            int64                  `json:"item_id"`
	PartName          string                 `json:"part_name"`
	PartNumber        string                 `json:"part_number"`
	Quantity          int                    `json:"quantity"`
	Status            string                 `json:"status"`
	StartDate         *time.Time             `json:"start_date"`
	DueDate           *time.Time             `json:"due_date"`
	DrawingData       string                 `json:"drawing_data"`
	Processes         []models.OrderProcess  `json:"processes"`
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
	ID              int64  `json:"id"`
	OrderNumber     string `json:"order_number"`
	CustomerName    string `json:"customer_name"`
	CustomerShortName string `json:"customer_short_name"`
	Status          string `json:"status"`
	Priority        string `json:"priority"`
}

// DashboardStats 看板卡片统计数据
type DashboardStats struct {
	PendingCount    int64 `json:"pending_count"`
	ProcessingCount int64 `json:"processing_count"`
	CompletedCount  int64 `json:"completed_count"`
	OverdueCount    int64 `json:"overdue_count"`    // 逾期订单
	WarningCount    int64 `json:"warning_count"`    // 告警订单
	NearDueCount    int64 `json:"near_due_count"`   // 临期订单
}

// GetDashboardStats 获取看板卡片统计数据
func (r *OrderRepository) GetDashboardStats() (*DashboardStats, error) {
	stats := &DashboardStats{}
	today := time.Now().Format("2006-01-02")

	// 统计各状态的零件数量
	rows, err := r.db.Table("order_items").
		Select("status, COUNT(*) as count").
		Where("status NOT IN ?", []string{"delivered", "completed"}).
		Group("status").
		Rows()
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
	r.db.Table("order_items").Where("status = ?", "completed").Count(&stats.CompletedCount)

	// 逾期订单：零件交期 < 今天 且订单状态未完成
	r.db.Table("order_items as oi").
		Joins("JOIN orders o ON o.id = oi.order_id").
		Where("oi.due_date IS NOT NULL AND oi.due_date < ?", today).
		Where("o.status NOT IN ?", []string{"delivered", "completed"}).
		Count(&stats.OverdueCount)

	// 告警订单：根据规则统计
	warningIDs := r.getOrderIDsByRuleType(0, "warning")
	stats.WarningCount = int64(len(warningIDs))

	// 临期订单：根据规则统计
	imminentIDs := r.getOrderIDsByRuleType(0, "imminent")
	stats.NearDueCount = int64(len(imminentIDs))

	return stats, nil
}

// GetDashboardItems 获取工作看板零件数据（带分页）
func (r *OrderRepository) GetDashboardItems(page, pageSize int) (*DashboardResult, error) {
	if pageSize <= 0 {
		pageSize = 20
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	// 1. 查询总数
	var total int64
	r.db.Table("order_items").
		Where("status NOT IN ?", []string{"delivered", "completed"}).
		Count(&total)

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

	err := r.db.Table("order_items as oi").
		Select(`o.id as order_id, o.order_number,
			COALESCE(o.customer_short_name, '') as customer_short_name,
			o.priority, oi.id as item_id, oi.part_name,
			COALESCE(oi.part_number, '') as part_number,
			oi.quantity, oi.status,
			oi.start_date, oi.due_date,
			COALESCE(oi.drawing_data, '') as drawing_data`).
		Joins("JOIN orders o ON o.id = oi.order_id").
		Where("oi.status NOT IN ?", []string{"delivered", "completed"}).
		Order("oi.start_date ASC, oi.due_date ASC, oi.status ASC").
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


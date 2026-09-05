package services

import (
	"fmt"
	"time"

	"gorm.io/gorm"
	"machining-erp/internal/models"
)

type OrderNumberService struct {
	db *gorm.DB
}

func NewOrderNumberService(db *gorm.DB) *OrderNumberService {
	return &OrderNumberService{db: db}
}

// Generate 生成订单号，格式: YHS-YYYYMMDD-XXX
func (s *OrderNumberService) Generate(corpID int64) (string, error) {
	today := time.Now().Format("20060102")
	prefix := fmt.Sprintf("YHS-%s-", today)

	var orderNumbers []string
	query := s.db.Model(&models.Order{}).
		Where("order_number LIKE ?", prefix+"%")
	if corpID > 0 {
		query = query.Where("corp_id = ?", corpID)
	}
	err := query.
		Pluck("order_number", &orderNumbers).Error
	if err != nil {
		return "", err
	}

	maxSuffix := 0
	for _, orderNumber := range orderNumbers {
		var suffix int
		n, _ := fmt.Sscanf(orderNumber, prefix+"%d", &suffix)
		if n == 1 && suffix > maxSuffix {
			maxSuffix = suffix
		}
	}

	return fmt.Sprintf("%s%03d", prefix, maxSuffix+1), nil
}

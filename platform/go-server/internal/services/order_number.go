package services

import (
	"database/sql"
	"fmt"
	"time"
)

type OrderNumberRepository interface {
	GetMaxSuffixToday(prefix string) (int, error)
}

type OrderNumberService struct {
	db *sql.DB
}

func NewOrderNumberService(db *sql.DB) *OrderNumberService {
	return &OrderNumberService{db: db}
}

// Generate 生成订单号，格式: YHS-YYYYMMDD-XXX
func (s *OrderNumberService) Generate() (string, error) {
	today := time.Now().Format("20060102")
	prefix := fmt.Sprintf("YHS-%s-", today)

	var maxSuffix int
	query := "SELECT order_number FROM orders WHERE order_number LIKE ?"
	rows, err := s.db.Query(query, prefix+"%")
	if err != nil {
		return "", err
	}
	defer rows.Close()

	for rows.Next() {
		var orderNumber string
		if err := rows.Scan(&orderNumber); err != nil {
			continue
		}
		// 解析后缀
		var suffix int
		n, _ := fmt.Sscanf(orderNumber, prefix+"%d", &suffix)
		if n == 1 && suffix > maxSuffix {
			maxSuffix = suffix
		}
	}

	return fmt.Sprintf("%s%d", prefix, maxSuffix+1), nil
}

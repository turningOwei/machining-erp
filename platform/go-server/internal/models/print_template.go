package models

import (
	"time"
)

type PrintTemplate struct {
	ID          int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	CorpID      int64     `gorm:"column:corp_id;default:0" json:"corp_id"` // 不显示在列表中
	Name        string    `gorm:"column:name;type:varchar(100);not null" json:"name"`
	MenuRoute    string    `gorm:"column:menu_route;type:varchar(100)" json:"menu_route"`
	ButtonKey    string    `gorm:"column:button_key;type:varchar(100);index" json:"button_key"`
	ButtonName   string    `gorm:"column:button_name;type:varchar(50)" json:"button_name"`
	Preview     string    `gorm:"column:preview;type:longtext" json:"preview"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at,omitempty"`
}

func (PrintTemplate) TableName() string { return "print_templates" }
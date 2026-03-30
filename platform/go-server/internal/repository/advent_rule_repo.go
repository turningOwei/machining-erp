package repository

import (
	"gorm.io/gorm"
	"machining-erp/internal/models"
)

type AdventRuleRepository struct {
	db *gorm.DB
}

func NewAdventRuleRepository(db *gorm.DB) *AdventRuleRepository {
	return &AdventRuleRepository{db: db}
}

func (r *AdventRuleRepository) GetAll(name string) ([]models.AdventRule, error) {
	var rules []models.AdventRule
	query := r.db.Order("id")
	if name != "" {
		query = query.Where("name LIKE ?", "%"+name+"%")
	}
	err := query.Find(&rules).Error
	return rules, err
}

func (r *AdventRuleRepository) Create(rule *models.AdventRule) (int64, error) {
	err := r.db.Create(rule).Error
	if err != nil {
		return 0, err
	}
	return int64(rule.ID), nil
}

func (r *AdventRuleRepository) Update(rule *models.AdventRule) error {
	return r.db.Model(rule).Updates(map[string]interface{}{
		"name":          rule.Name,
		"description":   rule.Description,
		"formula":       rule.Formula,
		"target_status": rule.TargetStatus,
		"scopeType":     rule.ScopeType,
		"ruleType":      rule.RuleType,
	}).Error
}

func (r *AdventRuleRepository) Delete(id int) error {
	return r.db.Delete(&models.AdventRule{}, id).Error
}
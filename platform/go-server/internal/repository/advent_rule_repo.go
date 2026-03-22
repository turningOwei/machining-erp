package repository

import (
	"database/sql"
	"machining-erp/internal/models"
)

type AdventRuleRepository struct {
	db *sql.DB
}

func NewAdventRuleRepository(db *sql.DB) *AdventRuleRepository {
	return &AdventRuleRepository{db: db}
}

func (r *AdventRuleRepository) GetAll(name string) ([]models.AdventRule, error) {
	query := "SELECT id, name, description, formula, target_status, scopeType, ruleType, created_at FROM advent_rules"
	var rows *sql.Rows
	var err error

	if name != "" {
		rows, err = r.db.Query(query+" WHERE name LIKE ? ORDER BY created_at DESC", "%"+name+"%")
	} else {
		rows, err = r.db.Query(query + " ORDER BY created_at DESC")
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []models.AdventRule = []models.AdventRule{} // 初始化为空数组，避免 null
	for rows.Next() {
		var rule models.AdventRule
		var description sql.NullString
		err := rows.Scan(&rule.ID, &rule.Name, &description, &rule.Formula, &rule.TargetStatus, &rule.ScopeType, &rule.RuleType, &rule.CreatedAt)
		if err != nil {
			return nil, err
		}
		rule.Description = description.String
		rules = append(rules, rule)
	}
	return rules, nil
}

func (r *AdventRuleRepository) Create(rule *models.AdventRule) (int64, error) {
	result, err := r.db.Exec(
		"INSERT INTO advent_rules (name, description, formula, target_status, scopeType, ruleType) VALUES (?, ?, ?, ?, ?, ?)",
		rule.Name, rule.Description, rule.Formula, rule.TargetStatus, rule.ScopeType, rule.RuleType,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (r *AdventRuleRepository) Update(rule *models.AdventRule) error {
	_, err := r.db.Exec(
		"UPDATE advent_rules SET name = ?, description = ?, formula = ?, target_status = ?, scopeType = ?, ruleType = ? WHERE id = ?",
		rule.Name, rule.Description, rule.Formula, rule.TargetStatus, rule.ScopeType, rule.RuleType, rule.ID,
	)
	return err
}

func (r *AdventRuleRepository) Delete(id int) error {
	_, err := r.db.Exec("DELETE FROM advent_rules WHERE id = ?", id)
	return err
}

package repository

import (
	"gorm.io/gorm"
	"machining-erp/internal/models"
)

type RoleRepository struct {
	db *gorm.DB
}

func NewRoleRepository(db *gorm.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

// FindByID 根据ID查询角色
func (r *RoleRepository) FindByID(id int64) (*models.Role, error) {
	var role models.Role
	err := r.db.First(&role, id).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// GetByCorpID 根据企业ID获取角色列表
func (r *RoleRepository) GetByCorpID(corpID int64) ([]models.Role, error) {
	var roles []models.Role
	err := r.db.Where("corp_id = ? AND status = ?", corpID, "active").Find(&roles).Error
	return roles, err
}
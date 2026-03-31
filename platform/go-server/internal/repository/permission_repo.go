package repository

import (
	"gorm.io/gorm"
	"machining-erp/internal/models"
)

type PermissionRepository struct {
	db *gorm.DB
}

func NewPermissionRepository(db *gorm.DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

// GetByUserID 根据用户ID获取权限列表
func (r *PermissionRepository) GetByUserID(userID int64) ([]models.Permission, error) {
	var permissions []models.Permission
	err := r.db.Where("user_id = ?", userID).Find(&permissions).Error
	return permissions, err
}

// Create 创建权限
func (r *PermissionRepository) Create(permission *models.Permission) error {
	return r.db.Create(permission).Error
}

// DeleteByUserID 删除用户的所有权限
func (r *PermissionRepository) DeleteByUserID(userID int64) error {
	return r.db.Where("user_id = ?", userID).Delete(&models.Permission{}).Error
}
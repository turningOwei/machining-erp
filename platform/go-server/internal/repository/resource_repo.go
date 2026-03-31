package repository

import (
	"gorm.io/gorm"
	"machining-erp/internal/models"
)

type ResourceRepository struct {
	db *gorm.DB
}

func NewResourceRepository(db *gorm.DB) *ResourceRepository {
	return &ResourceRepository{db: db}
}

// GetAll 获取所有资源
func (r *ResourceRepository) GetAll() ([]models.Resource, error) {
	var resources []models.Resource
	err := r.db.Where("status = ?", "active").Order("sort_order ASC").Find(&resources).Error
	return resources, err
}

// GetByIDs 根据ID列表获取资源
func (r *ResourceRepository) GetByIDs(ids []int64) ([]models.Resource, error) {
	var resources []models.Resource
	err := r.db.Where("id IN ? AND status = ?", ids, "active").Order("sort_order ASC").Find(&resources).Error
	return resources, err
}

// GetByRolePermissions 根据角色权限获取资源
func (r *ResourceRepository) GetByRolePermissions(roleID int64) ([]models.Resource, error) {
	var resources []models.Resource
	err := r.db.Table("resources r").
		Select("r.*").
		Joins("JOIN permissions p ON p.resource_id = r.id").
		Where("p.role_id = ? AND r.status = ?", roleID, "active").
		Order("r.sort_order ASC").
		Find(&resources).Error
	return resources, err
}

// GetByPlatformType 根据平台类型获取菜单资源
func (r *ResourceRepository) GetByPlatformType(platformType models.PlatformType) ([]models.Resource, error) {
	var resources []models.Resource
	err := r.db.Where("status = ? AND platform_type = ? AND resource_type = ?", "active", platformType, "menu").
		Order("sort_order ASC").
		Find(&resources).Error
	return resources, err
}
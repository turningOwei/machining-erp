package repository

import (
	"gorm.io/gorm"
	"machining-erp/internal/models"
)

type CustomerRepository struct {
	db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) *CustomerRepository {
	return &CustomerRepository{db: db}
}

func (r *CustomerRepository) GetAll() ([]models.Customer, error) {
	var customers []models.Customer
	err := r.db.Preload("Contacts").Order("name").Find(&customers).Error
	return customers, err
}

func (r *CustomerRepository) Create(name, shortName string, contacts []models.Contact) (int64, error) {
	customer := models.Customer{
		Name:      name,
		ShortName: shortName,
		Contacts:  contacts,
	}

	err := r.db.Create(&customer).Error
	if err != nil {
		return 0, err
	}
	return int64(customer.ID), nil
}

func (r *CustomerRepository) Update(id int, name, shortName string, contacts []models.Contact) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 更新客户
		if err := tx.Model(&models.Customer{}).Where("id = ?", id).Updates(map[string]interface{}{
			"name":      name,
			"short_name": shortName,
		}).Error; err != nil {
			return err
		}

		// 删除旧联系人
		if err := tx.Delete(&models.Contact{}, "customer_id = ?", id).Error; err != nil {
			return err
		}

		// 插入新联系人
		for _, ct := range contacts {
			ct.CustomerID = id
			if err := tx.Create(&ct).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *CustomerRepository) Delete(id int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 删除联系人
		if err := tx.Delete(&models.Contact{}, "customer_id = ?", id).Error; err != nil {
			return err
		}
		// 删除客户
		if err := tx.Delete(&models.Customer{}, id).Error; err != nil {
			return err
		}
		return nil
	})
}

// NameExists 检查客户名称是否存在，excludeID 用于更新时排除当前客户
func (r *CustomerRepository) NameExists(name string, excludeID int) (bool, error) {
	var count int64
	err := r.db.Model(&models.Customer{}).
		Where("name = ?", name).
		Where("id != ?", excludeID).
		Count(&count).Error
	return count > 0, err
}
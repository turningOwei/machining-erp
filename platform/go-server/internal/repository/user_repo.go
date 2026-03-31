package repository

import (
	"gorm.io/gorm"
	"machining-erp/internal/models"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// FindByUsername 根据用户名查询用户
func (r *UserRepository) FindByUsername(username string) (*models.User, error) {
	var user models.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByID 根据ID查询用户
func (r *UserRepository) FindByID(id int64) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Create 创建用户
func (r *UserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

// Update 更新用户
func (r *UserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

// UpdatePassword 更新用户密码
func (r *UserRepository) UpdatePassword(userID int64, corpID int64, newPassword string) error {
	return r.db.Model(&models.User{}).Where("id = ? AND corp_id = ?", userID, corpID).Update("password", newPassword).Error
}

// UpdateEmail 更新用户邮箱
func (r *UserRepository) UpdateEmail(userID int64, corpID int64, newEmail string, emailSentSuccess bool) error {
	return r.db.Model(&models.User{}).Where("id = ? AND corp_id = ?", userID, corpID).Updates(map[string]interface{}{
		"email":             newEmail,
		"email_sent_success": emailSentSuccess,
	}).Error
}

// UpdateEmailSentSuccess 更新邮箱发送成功标识
func (r *UserRepository) UpdateEmailSentSuccess(userID int64, corpID int64, success bool) error {
	return r.db.Model(&models.User{}).Where("id = ? AND corp_id = ?", userID, corpID).Update("email_sent_success", success).Error
}

// FindByIDAndCorpID 根据ID和CorpID查询用户
func (r *UserRepository) FindByIDAndCorpID(userID int64, corpID int64) (*models.User, error) {
	var user models.User
	err := r.db.Where("id = ? AND corp_id = ?", userID, corpID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}
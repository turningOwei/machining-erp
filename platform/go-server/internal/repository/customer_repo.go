package repository

import (
	"database/sql"
	"machining-erp/internal/models"
)

type CustomerRepository struct {
	db *sql.DB
}

func NewCustomerRepository(db *sql.DB) *CustomerRepository {
	return &CustomerRepository{db: db}
}

func (r *CustomerRepository) GetAll() ([]models.Customer, error) {
	// 查询所有客户
	rows, err := r.db.Query("SELECT id, name, short_name, created_at FROM customers ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	customerMap := make(map[int]*models.Customer)
	var customerIDs []int

	for rows.Next() {
		var c models.Customer
		var shortName sql.NullString
		err := rows.Scan(&c.ID, &c.Name, &shortName, &c.CreatedAt)
		if err != nil {
			return nil, err
		}
		c.ShortName = shortName.String
		c.Contacts = []models.Contact{}
		customerMap[c.ID] = &c
		customerIDs = append(customerIDs, c.ID)
	}

	// 查询所有联系人
	if len(customerIDs) > 0 {
		contactRows, err := r.db.Query("SELECT id, customer_id, name, contact FROM contacts ORDER BY id")
		if err != nil {
			return nil, err
		}
		defer contactRows.Close()

		for contactRows.Next() {
			var ct models.Contact
			err := contactRows.Scan(&ct.ID, &ct.CustomerID, &ct.Name, &ct.Contact)
			if err != nil {
				return nil, err
			}
			if customer, ok := customerMap[ct.CustomerID]; ok {
				customer.Contacts = append(customer.Contacts, ct)
			}
		}
	}

	// 转换为切片
	var customers []models.Customer
	for _, id := range customerIDs {
		customers = append(customers, *customerMap[id])
	}

	return customers, nil
}

func (r *CustomerRepository) Create(name, shortName string, contacts []models.Contact) (int64, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	result, err := tx.Exec("INSERT INTO customers (name, short_name) VALUES (?, ?)", name, shortName)
	if err != nil {
		return 0, err
	}
	customerID, _ := result.LastInsertId()

	// 插入联系人
	for _, ct := range contacts {
		_, err := tx.Exec("INSERT INTO contacts (customer_id, name, contact) VALUES (?, ?, ?)", customerID, ct.Name, ct.Contact)
		if err != nil {
			return 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return customerID, nil
}

func (r *CustomerRepository) Update(id int, name, shortName string, contacts []models.Contact) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 更新客户
	_, err = tx.Exec("UPDATE customers SET name = ?, short_name = ? WHERE id = ?", name, shortName, id)
	if err != nil {
		return err
	}

	// 删除旧联系人
	_, err = tx.Exec("DELETE FROM contacts WHERE customer_id = ?", id)
	if err != nil {
		return err
	}

	// 插入新联系人
	for _, ct := range contacts {
		_, err := tx.Exec("INSERT INTO contacts (customer_id, name, contact) VALUES (?, ?, ?)", id, ct.Name, ct.Contact)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *CustomerRepository) Delete(id int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 删除联系人
	_, err = tx.Exec("DELETE FROM contacts WHERE customer_id = ?", id)
	if err != nil {
		return err
	}

	// 删除客户
	_, err = tx.Exec("DELETE FROM customers WHERE id = ?", id)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// NameExists 检查客户名称是否存在，excludeID 用于更新时排除当前客户
func (r *CustomerRepository) NameExists(name string, excludeID int) (bool, error) {
	var count int
	var err error
	if excludeID > 0 {
		err = r.db.QueryRow("SELECT COUNT(*) FROM customers WHERE name = ? AND id != ?", name, excludeID).Scan(&count)
	} else {
		err = r.db.QueryRow("SELECT COUNT(*) FROM customers WHERE name = ?", name).Scan(&count)
	}
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
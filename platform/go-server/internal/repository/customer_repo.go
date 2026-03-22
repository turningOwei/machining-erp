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
	rows, err := r.db.Query("SELECT id, name, contact, created_at FROM customers ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var customers []models.Customer = []models.Customer{} // 初始化为空数组，避免 null
	for rows.Next() {
		var c models.Customer
		var contact sql.NullString
		err := rows.Scan(&c.ID, &c.Name, &contact, &c.CreatedAt)
		if err != nil {
			return nil, err
		}
		c.Contact = contact.String
		customers = append(customers, c)
	}
	return customers, nil
}

func (r *CustomerRepository) Create(name, contact string) (int64, error) {
	result, err := r.db.Exec("INSERT INTO customers (name, contact) VALUES (?, ?)", name, contact)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (r *CustomerRepository) Update(id int, name, contact string) error {
	_, err := r.db.Exec("UPDATE customers SET name = ?, contact = ? WHERE id = ?", name, contact, id)
	return err
}

func (r *CustomerRepository) Delete(id int) error {
	_, err := r.db.Exec("DELETE FROM customers WHERE id = ?", id)
	return err
}

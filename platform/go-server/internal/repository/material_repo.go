package repository

import (
	"database/sql"
	"machining-erp/internal/models"
)

type MaterialRepository struct {
	db *sql.DB
}

func NewMaterialRepository(db *sql.DB) *MaterialRepository {
	return &MaterialRepository{db: db}
}

func (r *MaterialRepository) GetAll() ([]models.Material, error) {
	rows, err := r.db.Query("SELECT id, name, spec, quantity, unit FROM materials")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	materials := []models.Material{} // 初始化为空数组，避免 null
	for rows.Next() {
		var m models.Material
		var spec sql.NullString
		err := rows.Scan(&m.ID, &m.Name, &spec, &m.Quantity, &m.Unit)
		if err != nil {
			return nil, err
		}
		m.Spec = spec.String
		materials = append(materials, m)
	}
	return materials, nil
}

func (r *MaterialRepository) Create(m *models.Material) (int64, error) {
	result, err := r.db.Exec(
		"INSERT INTO materials (name, spec, quantity, unit) VALUES (?, ?, ?, ?)",
		m.Name, m.Spec, m.Quantity, m.Unit,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

type RemnantRepository struct {
	db *sql.DB
}

func NewRemnantRepository(db *sql.DB) *RemnantRepository {
	return &RemnantRepository{db: db}
}

func (r *RemnantRepository) GetAll() ([]models.Remnant, error) {
	rows, err := r.db.Query(`
		SELECT remnants.id, remnants.material_id, materials.name, remnants.dimensions,
		       remnants.photo_data, remnants.notes, remnants.created_at
		FROM remnants
		JOIN materials ON remnants.material_id = materials.id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	remnants := []models.Remnant{} // 初始化为空数组，避免 null
	for rows.Next() {
		var r models.Remnant
		var photoData, notes sql.NullString
		err := rows.Scan(&r.ID, &r.MaterialID, &r.MaterialName, &r.Dimensions, &photoData, &notes, &r.CreatedAt)
		if err != nil {
			return nil, err
		}
		r.PhotoData = photoData.String
		r.Notes = notes.String
		remnants = append(remnants, r)
	}
	return remnants, nil
}

func (r *RemnantRepository) Create(remnant *models.Remnant) (int64, error) {
	result, err := r.db.Exec(
		"INSERT INTO remnants (material_id, dimensions, photo_data, notes) VALUES (?, ?, ?, ?)",
		remnant.MaterialID, remnant.Dimensions, remnant.PhotoData, remnant.Notes,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

package models

import "time"

type Material struct {
	ID       int     `json:"id"`
	Name     string  `json:"name"`
	Spec     string  `json:"spec,omitempty"`
	Quantity float64 `json:"quantity"`
	Unit     string  `json:"unit"`
}

type Remnant struct {
	ID          int       `json:"id"`
	MaterialID  int       `json:"material_id"`
	MaterialName string   `json:"material_name,omitempty"`
	Dimensions  string    `json:"dimensions"`
	PhotoData   string    `json:"photo_data,omitempty"`
	Notes       string    `json:"notes,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

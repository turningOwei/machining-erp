package models

import "time"

type Contact struct {
	ID       int    `json:"id,omitempty"`
	CustomerID int  `json:"customer_id,omitempty"`
	Name     string `json:"name"`
	Contact  string `json:"contact"`
}

type Customer struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	ShortName string    `json:"short_name,omitempty"`
	Contacts  []Contact `json:"contacts,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
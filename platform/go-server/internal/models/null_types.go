package models

import (
	"database/sql"
	"encoding/json"
	"time"
)

// NullString 是一个可序列化为 null 的字符串类型
type NullString struct {
	sql.NullString
}

func (ns NullString) MarshalJSON() ([]byte, error) {
	if !ns.Valid {
		return json.Marshal(nil)
	}
	return json.Marshal(ns.String)
}

func (ns *NullString) UnmarshalJSON(data []byte) error {
	var s *string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	if s != nil {
		ns.String = *s
		ns.Valid = true
	} else {
		ns.Valid = false
	}
	return nil
}

// NullInt64 是一个可序列化为 null 的 int64 类型
type NullInt64 struct {
	sql.NullInt64
}

func (ni NullInt64) MarshalJSON() ([]byte, error) {
	if !ni.Valid {
		return json.Marshal(nil)
	}
	return json.Marshal(ni.Int64)
}

func (ni *NullInt64) UnmarshalJSON(data []byte) error {
	var i *int64
	if err := json.Unmarshal(data, &i); err != nil {
		return err
	}
	if i != nil {
		ni.Int64 = *i
		ni.Valid = true
	} else {
		ni.Valid = false
	}
	return nil
}

// NullFloat64 是一个可序列化为 null 的 float64 类型
type NullFloat64 struct {
	sql.NullFloat64
}

func (nf NullFloat64) MarshalJSON() ([]byte, error) {
	if !nf.Valid {
		return json.Marshal(nil)
	}
	return json.Marshal(nf.Float64)
}

func (nf *NullFloat64) UnmarshalJSON(data []byte) error {
	var f *float64
	if err := json.Unmarshal(data, &f); err != nil {
		return err
	}
	if f != nil {
		nf.Float64 = *f
		nf.Valid = true
	} else {
		nf.Valid = false
	}
	return nil
}

// Date 是一个可序列化为日期字符串的类型 (支持 "2006-01-02" 格式)
type Date struct {
	time.Time
	Valid bool
}

func (d Date) MarshalJSON() ([]byte, error) {
	if !d.Valid || d.Time.IsZero() {
		return json.Marshal(nil)
	}
	return json.Marshal(d.Time.Format("2006-01-02"))
}

func (d *Date) UnmarshalJSON(data []byte) error {
	var s *string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	if s == nil || *s == "" {
		d.Time = time.Time{}
		d.Valid = false
		return nil
	}
	// 尝试解析 "2006-01-02" 格式
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		// 尝试解析 RFC3339 格式
		t, err = time.Parse(time.RFC3339, *s)
		if err != nil {
			return err
		}
	}
	d.Time = t
	d.Valid = true
	return nil
}

// Scan 实现 sql.Scanner 接口
func (d *Date) Scan(value interface{}) error {
	if value == nil {
		d.Time = time.Time{}
		d.Valid = false
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		d.Time = v
		d.Valid = true
	case []byte:
		t, err := time.Parse("2006-01-02", string(v))
		if err != nil {
			t, err = time.Parse(time.RFC3339, string(v))
			if err != nil {
				return err
			}
		}
		d.Time = t
		d.Valid = true
	case string:
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			t, err = time.Parse(time.RFC3339, v)
			if err != nil {
				return err
			}
		}
		d.Time = t
		d.Valid = true
	}
	return nil
}

func (d *Date) ToTimePtr() *time.Time {
	if !d.Valid || d.Time.IsZero() {
		return nil
	}
	return &d.Time
}

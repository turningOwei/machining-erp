package config

import (
	"os"
	"strconv"
)

type Config struct {
	ServerPort          int
	MySQLHost           string
	MySQLUser           string
	MySQLPassword       string
	MySQLDatabase       string
	MySQLPort           int
	AdminUser           string
	AdminPassword       string
	MaxLoginAttempts    int
	LockDurationMinutes int
}

func Load() *Config {
	return &Config{
		ServerPort:          getEnvInt("PORT", 8080),
		MySQLHost:           getEnv("MYSQL_HOST", "localhost"),
		MySQLUser:           getEnv("MYSQL_USER", "root"),
		MySQLPassword:       getEnv("MYSQL_PASSWORD", ""),
		MySQLDatabase:       getEnv("MYSQL_DATABASE", "erp"),
		MySQLPort:           getEnvInt("MYSQL_PORT", 3306),
		AdminUser:           getEnv("ADMIN_USER", "admin"),
		AdminPassword:       getEnv("ADMIN_PASSWORD", "yhs@2026"),
		MaxLoginAttempts:    3,
		LockDurationMinutes: 120,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

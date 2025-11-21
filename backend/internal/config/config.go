package config

import (
	"os"
	"strings"
)

type Config struct {
	Port           string
	AllowedOrigins string
	MaxConnections int
	EnableLogging  bool
	EnableMetrics  bool
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001" // Default to 3001 to avoid conflicts with web servers on 8080
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		// Default to production domain and localhost for development
		allowedOrigins = "https://speedflux.hashmatrix.dev,https://www.speedflux.hashmatrix.dev,http://localhost:3000,http://localhost:5173"
	}

	maxConnections := 1000
	if maxConns := os.Getenv("MAX_CONNECTIONS"); maxConns != "" {
		// Parse maxConnections from env if needed
		_ = maxConns
	}

	enableLogging := os.Getenv("ENABLE_LOGGING") != "false"
	enableMetrics := os.Getenv("ENABLE_METRICS") != "false"

	return &Config{
		Port:           port,
		AllowedOrigins: allowedOrigins,
		MaxConnections: maxConnections,
		EnableLogging:  enableLogging,
		EnableMetrics:  enableMetrics,
	}
}

func (c *Config) GetAllowedOriginsList() []string {
	if c.AllowedOrigins == "*" {
		return []string{"*"}
	}
	return strings.Split(c.AllowedOrigins, ",")
}


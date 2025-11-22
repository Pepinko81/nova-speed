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
	GeoIPCityPath  string
	GeoIPASNPath   string
	GeoIPISPPath   string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001" // Default to 3001 to avoid conflicts with web servers on 8080
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		// Default to production domain and localhost for development
		// Include common local network ranges for local testing
		allowedOrigins = "https://hashmatrix.dev,https://www.hashmatrix.dev,http://localhost:3000,http://localhost:5173,http://192.168.0.0/16,http://10.0.0.0/8,http://172.16.0.0/12"
	}

	maxConnections := 1000
	if maxConns := os.Getenv("MAX_CONNECTIONS"); maxConns != "" {
		// Parse maxConnections from env if needed
		_ = maxConns
	}

	enableLogging := os.Getenv("ENABLE_LOGGING") != "false"
	enableMetrics := os.Getenv("ENABLE_METRICS") != "false"

	// GeoIP database paths
	geoIPCityPath := os.Getenv("GEOIP_CITY_PATH")
	if geoIPCityPath == "" {
		geoIPCityPath = "/usr/share/GeoIP/GeoLite2-City.mmdb"
	}

	geoIPASNPath := os.Getenv("GEOIP_ASN_PATH")
	if geoIPASNPath == "" {
		geoIPASNPath = "/usr/share/GeoIP/GeoLite2-ASN.mmdb"
	}

	geoIPISPPath := os.Getenv("GEOIP_ISP_PATH")
	if geoIPISPPath == "" {
		geoIPISPPath = "/usr/share/GeoIP/GeoLite2-ISP.mmdb"
	}

	return &Config{
		Port:           port,
		AllowedOrigins: allowedOrigins,
		MaxConnections: maxConnections,
		EnableLogging:  enableLogging,
		EnableMetrics:  enableMetrics,
		GeoIPCityPath:  geoIPCityPath,
		GeoIPASNPath:   geoIPASNPath,
		GeoIPISPPath:   geoIPISPPath,
	}
}

func (c *Config) GetAllowedOriginsList() []string {
	if c.AllowedOrigins == "*" {
		return []string{"*"}
	}
	return strings.Split(c.AllowedOrigins, ",")
}


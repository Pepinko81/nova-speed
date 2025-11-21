package services

import (
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/oschwald/geoip2-golang"
	"go.uber.org/zap"
)

type GeolocationService struct {
	logger     *zap.Logger
	db         *geoip2.Reader
	cache      map[string]*IPInfo
	cacheMutex sync.RWMutex
	cacheTTL   time.Duration
}

type IPInfo struct {
	IP          string    `json:"ip"`
	Country     string    `json:"country"`
	CountryCode string    `json:"countryCode"`
	City        string    `json:"city"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	ASN         uint      `json:"asn"`
	ISP         string    `json:"isp"`
	Timezone    string    `json:"timezone"`
	Accuracy    string    `json:"accuracy"`
	Cached      bool      `json:"-"`
	ExpiresAt   time.Time `json:"-"`
}

func NewGeolocationService(logger *zap.Logger, dbPath string) (*GeolocationService, error) {
	db, err := geoip2.Open(dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open GeoLite2 database: %w", err)
	}

	service := &GeolocationService{
		logger:   logger,
		db:       db,
		cache:    make(map[string]*IPInfo),
		cacheTTL: 24 * time.Hour, // Cache for 24 hours
	}

	// Start cache cleanup goroutine
	go service.cleanupCache()

	return service, nil
}

func (s *GeolocationService) Close() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// GetClientIP extracts the real client IP from the request
func (s *GeolocationService) GetClientIP(c *fiber.Ctx) string {
	// Try various headers for real IP (useful behind proxies/load balancers)
	ip := c.Get("X-Real-IP")
	if ip != "" {
		return ip
	}

	ip = c.Get("X-Forwarded-For")
	if ip != "" {
		// X-Forwarded-For can contain multiple IPs separated by commas
		// Take the first one (original client IP)
		if idx := strings.Index(ip, ","); idx != -1 {
			ip = strings.TrimSpace(ip[:idx])
		}
		return ip
	}

	ip = c.Get("CF-Connecting-IP") // Cloudflare
	if ip != "" {
		return ip
	}

	// Fallback to RemoteIP
	return c.IP()
}

// GetIPInfo retrieves geolocation information for an IP address
func (s *GeolocationService) GetIPInfo(ipStr string) (*IPInfo, error) {
	// Check cache first
	s.cacheMutex.RLock()
	if cached, exists := s.cache[ipStr]; exists {
		if time.Now().Before(cached.ExpiresAt) {
			s.cacheMutex.RUnlock()
			cached.Cached = true
			return cached, nil
		}
	}
	s.cacheMutex.RUnlock()

	// Parse IP
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return nil, fmt.Errorf("invalid IP address: %s", ipStr)
	}

	info := &IPInfo{
		IP:     ipStr,
		ExpiresAt: time.Now().Add(s.cacheTTL),
	}

	// Lookup City database
	record, err := s.db.City(ip)
	if err == nil {
		if len(record.Country.Names) > 0 {
			info.Country = record.Country.Names["en"]
		}
		info.CountryCode = record.Country.IsoCode
		
		if len(record.City.Names) > 0 {
			info.City = record.City.Names["en"]
		}
		
		if record.Location.Latitude != 0 || record.Location.Longitude != 0 {
			info.Latitude = record.Location.Latitude
			info.Longitude = record.Location.Longitude
			
			// Determine accuracy based on location data
			if record.Location.AccuracyRadius > 0 {
				if record.Location.AccuracyRadius < 10 {
					info.Accuracy = "City level (high accuracy)"
				} else if record.Location.AccuracyRadius < 50 {
					info.Accuracy = "City level (medium accuracy)"
				} else {
					info.Accuracy = "Regional level (approximate)"
				}
			} else {
				info.Accuracy = "Country level (approximate)"
			}
		} else {
			info.Accuracy = "Country level (approximate)"
		}

		// Timezone
		if record.Location.TimeZone != "" {
			info.Timezone = record.Location.TimeZone
		}
	}

	// Try to get ASN/ISP info (may not be available in City database)
	// Note: This requires separate ASN or ISP database files
	// For now, we'll try ASN method which might work if ASN data is in City DB
	if asnRecord, err := s.db.ASN(ip); err == nil {
		info.ASN = asnRecord.AutonomousSystemNumber
		info.ISP = asnRecord.AutonomousSystemOrganization
	} else {
		// Try ISP database if ASN lookup fails
		if ispRecord, err := s.db.ISP(ip); err == nil {
			info.ISP = ispRecord.ISP
		}
	}

	// Cache the result
	s.cacheMutex.Lock()
	s.cache[ipStr] = info
	s.cacheMutex.Unlock()

	return info, nil
}

// cleanupCache periodically removes expired cache entries
func (s *GeolocationService) cleanupCache() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		s.cacheMutex.Lock()
		for ip, info := range s.cache {
			if now.After(info.ExpiresAt) {
				delete(s.cache, ip)
			}
		}
		s.cacheMutex.Unlock()
	}
}


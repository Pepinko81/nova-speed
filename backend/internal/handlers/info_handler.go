package handlers

import (
	"nova-speed/backend/internal/config"
	"nova-speed/backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type InfoHandler struct {
	logger          *zap.Logger
	config          *config.Config
	geolocationService *services.GeolocationService
}

func NewInfoHandler(logger *zap.Logger, cfg *config.Config, geoService *services.GeolocationService) *InfoHandler {
	return &InfoHandler{
		logger:          logger,
		config:          cfg,
		geolocationService: geoService,
	}
}

// HandleInfo returns client IP and geolocation information
func (h *InfoHandler) HandleInfo(c *fiber.Ctx) error {
	// Get client IP
	clientIP := h.geolocationService.GetClientIP(c)

	// Get geolocation info
	info, err := h.geolocationService.GetIPInfo(clientIP)
	if err != nil {
		h.logger.Warn("Failed to get IP info", zap.String("ip", clientIP), zap.Error(err))
		
		// Return basic info even if geolocation fails
		return c.JSON(fiber.Map{
			"ip":       clientIP,
			"error":    "Geolocation lookup failed",
			"message":  "IP detected but geolocation database not available",
		})
	}

	h.logger.Info("IP info requested",
		zap.String("ip", clientIP),
		zap.String("country", info.Country),
		zap.String("city", info.City),
		zap.Bool("cached", info.Cached),
	)

	return c.JSON(info)
}


package handlers

import (
	"context"
	"sync"

	"nova-speed/backend/internal/config"
	"nova-speed/backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

type TestHandler struct {
	logger           *zap.Logger
	config           *config.Config
	pingService      *services.PingService
	downloadService  *services.DownloadService
	uploadService    *services.UploadService
	metricsService   *services.MetricsService
	activeConnections sync.Map
}

func NewTestHandler(logger *zap.Logger, cfg *config.Config) *TestHandler {
	return &TestHandler{
		logger:          logger,
		config:          cfg,
		pingService:     services.NewPingService(logger),
		downloadService: services.NewDownloadService(logger),
		uploadService:   services.NewUploadService(logger),
		metricsService:  services.NewMetricsService(logger),
	}
}

// RegisterWebSocketRoutes registers WebSocket routes with actual handlers
func (h *TestHandler) RegisterWebSocketRoutes(app *fiber.App) {
	// Ping test WebSocket handler
	app.Get("/ws/ping", websocket.New(func(c *websocket.Conn) {
		h.handlePingWebSocket(c)
	}))

	// Download test WebSocket handler
	app.Get("/ws/download", websocket.New(func(c *websocket.Conn) {
		h.handleDownloadWebSocket(c)
	}))

	// Upload test WebSocket handler
	app.Get("/ws/upload", websocket.New(func(c *websocket.Conn) {
		h.handleUploadWebSocket(c)
	}))
}

func (h *TestHandler) handlePingWebSocket(c *websocket.Conn) {
	defer c.Close()
	
	connID := c.RemoteAddr().String()
	h.activeConnections.Store(connID, true)
	defer h.activeConnections.Delete(connID)

	h.logger.Info("Ping test started", zap.String("remote", connID))

	// Run ping test
	result := h.pingService.RunTest(c)
	
	// Send result
	if err := c.WriteJSON(result); err != nil {
		h.logger.Error("Failed to send ping result", zap.Error(err))
		return
	}

	h.logger.Info("Ping test completed",
		zap.Float64("latency", result.Latency),
		zap.Float64("jitter", result.Jitter),
		zap.String("remote", connID),
	)
}

func (h *TestHandler) handleDownloadWebSocket(c *websocket.Conn) {
	defer c.Close()
	
	connID := c.RemoteAddr().String()
	h.activeConnections.Store(connID, true)
	defer h.activeConnections.Delete(connID)

	h.logger.Info("Download test started", zap.String("remote", connID))

	// Log CPU usage if enabled
	if h.config.EnableMetrics {
		go func() {
			ctx := context.Background()
			h.metricsService.LogCPUUsage(ctx)
		}()
	}

	// Read start message (optional, use default if not provided)
	var startMsg struct {
		ChunkSize int `json:"chunkSize"`
	}
	_ = c.ReadJSON(&startMsg) // Ignore error, use default if not provided
	
	chunkSize := startMsg.ChunkSize
	if chunkSize == 0 {
		chunkSize = 256 * 1024 // Default 256 KB
	}

	// Run download test
	result := h.downloadService.RunTest(c, chunkSize)

	// Log traffic if enabled
	if h.config.EnableLogging {
		h.metricsService.LogTraffic(result.Bytes, "download", result.Duration)
	}

	// Send result
	if err := c.WriteJSON(result); err != nil {
		h.logger.Error("Failed to send download result", zap.Error(err))
		return
	}

	h.logger.Info("Download test completed",
		zap.Float64("throughput", result.Throughput),
		zap.Int64("bytes", result.Bytes),
		zap.String("remote", connID),
	)
}

func (h *TestHandler) handleUploadWebSocket(c *websocket.Conn) {
	defer c.Close()
	
	connID := c.RemoteAddr().String()
	h.activeConnections.Store(connID, true)
	defer h.activeConnections.Delete(connID)

	h.logger.Info("Upload test started", zap.String("remote", connID))

	// Log CPU usage if enabled
	if h.config.EnableMetrics {
		go func() {
			ctx := context.Background()
			h.metricsService.LogCPUUsage(ctx)
		}()
	}

	// Run upload test
	result := h.uploadService.RunTest(c)

	// Log traffic if enabled
	if h.config.EnableLogging {
		h.metricsService.LogTraffic(result.Bytes, "upload", result.Duration)
	}

	// Send result
	if err := c.WriteJSON(result); err != nil {
		h.logger.Error("Failed to send upload result", zap.Error(err))
		return
	}

	h.logger.Info("Upload test completed",
		zap.Float64("throughput", result.Throughput),
		zap.Int64("bytes", result.Bytes),
		zap.String("remote", connID),
	)
}

// GetActiveConnections returns the number of active connections
func (h *TestHandler) GetActiveConnections() int {
	count := 0
	h.activeConnections.Range(func(key, value interface{}) bool {
		count++
		return true
	})
	return count
}


package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"nova-speed/backend/internal/config"
	"nova-speed/backend/internal/handlers"
	"nova-speed/backend/internal/logger"
	"nova-speed/backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	appLogger := logger.NewLogger()
	defer appLogger.Sync()

	// Load configuration
	cfg := config.Load()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Nova Speed Test Backend",
		ServerHeader: "Nova-Speed",
		ErrorHandler: middleware.ErrorHandler,
	})

	// Middleware
	app.Use(recover.New())
	
	// Configure CORS
	corsOrigins := cfg.AllowedOrigins
	if corsOrigins == "*" {
		corsOrigins = "*"
	}
	
	app.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowMethods:     "GET,POST,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
		MaxAge:           3600,
	}))

	// Security headers middleware
	app.Use(middleware.SecurityHeaders())

	// Connection limit middleware
	connLimiter := middleware.NewConnectionLimiter(cfg.MaxConnections)
	app.Use(connLimiter.Middleware())

	// Request logging middleware
	app.Use(middleware.RequestLogger(appLogger))

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "nova-speed-backend",
		})
	})

	// Initialize handlers
	testHandler := handlers.NewTestHandler(appLogger, cfg)

	// Register WebSocket routes
	testHandler.RegisterWebSocketRoutes(app)

	// Start server
	go func() {
		addr := ":" + cfg.Port
		appLogger.Info("Starting server", zap.String("address", addr))
		if err := app.Listen(addr); err != nil {
			appLogger.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	appLogger.Info("Shutting down server...")
	if err := app.Shutdown(); err != nil {
		appLogger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	log.Println("Server exited")
}


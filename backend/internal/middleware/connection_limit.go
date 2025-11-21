package middleware

import (
	"sync"

	"github.com/gofiber/fiber/v2"
)

type ConnectionLimiter struct {
	activeConnections int
	maxConnections    int
	mu                sync.Mutex
}

func NewConnectionLimiter(maxConnections int) *ConnectionLimiter {
	return &ConnectionLimiter{
		maxConnections: maxConnections,
	}
}

func (cl *ConnectionLimiter) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		cl.mu.Lock()
		if cl.activeConnections >= cl.maxConnections {
			cl.mu.Unlock()
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error": "Server is at maximum capacity. Please try again later.",
			})
		}
		cl.activeConnections++
		cl.mu.Unlock()

		// Decrement on connection close
		defer func() {
			cl.mu.Lock()
			cl.activeConnections--
			cl.mu.Unlock()
		}()

		return c.Next()
	}
}

func (cl *ConnectionLimiter) GetActiveConnections() int {
	cl.mu.Lock()
	defer cl.mu.Unlock()
	return cl.activeConnections
}


package services

import (
	"time"

	"nova-speed/backend/internal/models"
	"nova-speed/backend/internal/utils"

	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

type PingService struct {
	logger *zap.Logger
}

func NewPingService(logger *zap.Logger) *PingService {
	return &PingService{
		logger: logger,
	}
}

// RunTest executes a ping/latency/jitter test
func (s *PingService) RunTest(c *websocket.Conn) *models.PingResult {
	const (
		numPackets = 20
		timeout    = 5 * time.Second
	)

	var latencies []float64
	startTime := time.Now()

	// Send ping packets and measure latency
	for i := 0; i < numPackets; i++ {
		// Record send time using monotonic clock
		sendTime := time.Now()
		pingTimestamp := models.GetMonotonicTime()
		
		// Send ping
		pingMsg := models.PingMessage{
			Type:      "ping",
			Timestamp: pingTimestamp,
			Sequence:  i,
		}

		if err := c.WriteJSON(pingMsg); err != nil {
			s.logger.Error("Failed to send ping", zap.Error(err), zap.Int("sequence", i))
			continue
		}

		// Wait for pong with timeout
		c.SetReadDeadline(time.Now().Add(timeout))
		
		var pongMsg models.PingMessage
		if err := c.ReadJSON(&pongMsg); err != nil {
			s.logger.Warn("Failed to receive pong", zap.Error(err), zap.Int("sequence", i))
			continue
		}

		// Verify it's a pong response
		if pongMsg.Type != "pong" || pongMsg.Sequence != i {
			s.logger.Warn("Invalid pong message", zap.Int("sequence", i))
			continue
		}

		// Calculate latency using wall clock time (more accurate for network)
		// We measure RTT (Round Trip Time) from when we sent to when we received
		rtt := time.Since(sendTime)
		latencyMs := float64(rtt.Nanoseconds()) / 1_000_000.0 // Convert to milliseconds
		
		// Validate latency is reasonable (filter out unrealistic values)
		// Localhost should be < 10ms, normal network < 500ms
		if latencyMs < 0 || latencyMs > 1000 {
			s.logger.Warn("Invalid latency measurement, skipping", 
				zap.Float64("latency", latencyMs),
				zap.Int("sequence", i))
			continue
		}

		latencies = append(latencies, latencyMs)

		// Small delay between packets
		time.Sleep(50 * time.Millisecond)
	}

	// Calculate results
	avgLatency := utils.CalculateAverageLatency(latencies)
	jitter := utils.CalculateJitter(latencies)

	duration := time.Since(startTime).Seconds()

	s.logger.Info("Ping test completed",
		zap.Float64("avgLatency", avgLatency),
		zap.Float64("jitter", jitter),
		zap.Int("packets", len(latencies)),
		zap.Float64("duration", duration),
	)

	return &models.PingResult{
		Type:      "result",
		Latency:   avgLatency,
		Jitter:    jitter,
		Packets:   len(latencies),
		Timestamp: time.Now().Unix(),
	}
}


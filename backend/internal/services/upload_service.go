package services

import (
	"encoding/json"
	"sync/atomic"
	"time"

	"nova-speed/backend/internal/models"
	"nova-speed/backend/internal/utils"

	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

type UploadService struct {
	logger *zap.Logger
}

func NewUploadService(logger *zap.Logger) *UploadService {
	return &UploadService{
		logger: logger,
	}
}

// RunTest executes an upload throughput test
func (s *UploadService) RunTest(c *websocket.Conn) *models.UploadResult {
	const (
		testDuration    = 10 * time.Second // 10 second test
		minChunkSize    = 64 * 1024       // 64 KB minimum
		maxChunkSize    = 10 * 1024 * 1024 // 10 MB maximum
		initialChunkSize = 256 * 1024      // 256 KB initial
	)

	startTime := time.Now()
	endTime := startTime.Add(testDuration)

	var totalBytes int64
	chunkSize := initialChunkSize
	var currentThroughput float64

	// Send start message
	startMsg := models.UploadMessage{
		Type:      "start",
		ChunkSize: chunkSize,
		Sequence:  0,
	}

	if err := c.WriteJSON(startMsg); err != nil {
		s.logger.Error("Failed to send start message", zap.Error(err))
		return &models.UploadResult{
			Type:       "result",
			Throughput: 0,
			Bytes:      0,
			Duration:   0,
			Timestamp:  time.Now().Unix(),
		}
	}

	// Receive and process upload chunks
	sequence := 0
	lastAdaptationTime := startTime
	done := false

	// Use a goroutine to handle reading while monitoring time
	go func() {
		for !done {
			// Set read deadline
			remainingTime := endTime.Sub(time.Now())
			if remainingTime <= 0 {
				done = true
				break
			}
			
			// Set deadline to remaining time or 2 seconds, whichever is smaller
			deadline := remainingTime
			if deadline > 2*time.Second {
				deadline = 2 * time.Second
			}
			c.SetReadDeadline(time.Now().Add(deadline))

			// Read message (could be binary or text/JSON)
			messageType, data, err := c.ReadMessage()
			if err != nil {
				// Check if it's a timeout
				if netErr, ok := err.(interface{ Timeout() bool }); ok && netErr.Timeout() {
					// Continue if we haven't reached end time
					if time.Now().Before(endTime) {
						continue
					}
				}
				// Other errors - log and break
				if !done {
					s.logger.Debug("Failed to read message", zap.Error(err))
				}
				done = true
				break
			}

			// Handle text/JSON messages (like "complete")
			if messageType == websocket.TextMessage {
				var msg models.UploadMessage
				if err := json.Unmarshal(data, &msg); err == nil {
					if msg.Type == "complete" {
						done = true
						break
					}
				}
				continue
			}

			// Handle binary messages (upload data)
			if messageType == websocket.BinaryMessage {
				// Update total bytes
				bytesReceived := int64(len(data))
				atomic.AddInt64(&totalBytes, bytesReceived)
				sequence++

				// Calculate current throughput
				elapsed := time.Since(startTime).Seconds()
				if elapsed > 0 {
					currentThroughput = utils.CalculateThroughput(atomic.LoadInt64(&totalBytes), elapsed)
				}

				// Adaptive chunk size adjustment every 2 seconds
				if time.Since(lastAdaptationTime) >= 2*time.Second {
					newChunkSize := utils.AdaptiveChunkSize(currentThroughput, minChunkSize, maxChunkSize)
					if newChunkSize != chunkSize {
						s.logger.Info("Adapting upload chunk size",
							zap.Int("oldChunkSize", chunkSize),
							zap.Int("newChunkSize", newChunkSize),
							zap.Float64("throughput", currentThroughput),
						)
						chunkSize = newChunkSize

						// Send updated chunk size to client
						updateMsg := models.UploadMessage{
							Type:      "chunkSize",
							ChunkSize: chunkSize,
							Sequence:  sequence,
						}
						if err := c.WriteJSON(updateMsg); err != nil {
							s.logger.Warn("Failed to send chunk size update", zap.Error(err))
						}
					}
					lastAdaptationTime = time.Now()
				}
			}
		}
	}()

	// Wait for test duration
	<-time.After(testDuration)
	done = true
	
	// Give a moment for any remaining messages
	time.Sleep(100 * time.Millisecond)

	duration := time.Since(startTime).Seconds()
	
	// Ensure minimum duration for accurate measurement
	if duration < 0.1 {
		duration = 0.1
	}
	
	finalThroughput := utils.CalculateThroughput(atomic.LoadInt64(&totalBytes), duration)
	
	// Validate throughput - cap unrealistic values (likely localhost loopback)
	// If throughput is > 10 Gbps, it's likely a localhost measurement issue
	if finalThroughput > 10000 {
		s.logger.Warn("Unrealistic throughput detected, likely localhost loopback",
			zap.Float64("throughput", finalThroughput),
			zap.Int64("bytes", atomic.LoadInt64(&totalBytes)),
			zap.Float64("duration", duration))
		// Cap at reasonable maximum (10 Gbps)
		finalThroughput = 10000
	}

	s.logger.Info("Upload test completed",
		zap.Float64("throughput", finalThroughput),
		zap.Int64("bytes", atomic.LoadInt64(&totalBytes)),
		zap.Float64("duration", duration),
		zap.Int("chunks", sequence),
	)

	return &models.UploadResult{
		Type:       "result",
		Throughput: finalThroughput,
		Bytes:      atomic.LoadInt64(&totalBytes),
		Duration:   duration,
		Timestamp:  time.Now().Unix(),
	}
}

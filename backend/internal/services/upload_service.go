package services

import (
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
		testDuration = 10 * time.Second // 10 second test
		minChunkSize = 64 * 1024       // 64 KB minimum
		maxChunkSize = 10 * 1024 * 1024 // 10 MB maximum
		initialChunkSize = 256 * 1024   // 256 KB initial
	)

	startTime := time.Now()
	endTime := startTime.Add(testDuration)

	var totalBytes int64
	chunkSize := initialChunkSize
	var currentThroughput float64

	// Set read deadline
	c.SetReadDeadline(endTime)

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

	for {
		if time.Now().After(endTime) {
			break
		}

		// Read message type first
		var msg models.UploadMessage
		if err := c.ReadJSON(&msg); err != nil {
			s.logger.Warn("Failed to read upload message", zap.Error(err))
			break
		}

		if msg.Type == "complete" {
			break
		}

		// Read binary data
		_, data, err := c.ReadMessage()
		if err != nil {
			s.logger.Warn("Failed to read binary data", zap.Error(err))
			break
		}

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

		// Send acknowledgment (optional, for flow control)
		if sequence%10 == 0 {
			ackMsg := models.UploadMessage{
				Type:     "ack",
				Sequence: sequence,
			}
			if err := c.WriteJSON(ackMsg); err != nil {
				s.logger.Warn("Failed to send ack", zap.Error(err))
			}
		}
	}

	duration := time.Since(startTime).Seconds()
	finalThroughput := utils.CalculateThroughput(atomic.LoadInt64(&totalBytes), duration)

	s.logger.Info("Upload test completed",
		zap.Float64("throughput", finalThroughput),
		zap.Int64("bytes", atomic.LoadInt64(&totalBytes)),
		zap.Float64("duration", duration),
	)

	return &models.UploadResult{
		Type:       "result",
		Throughput: finalThroughput,
		Bytes:      atomic.LoadInt64(&totalBytes),
		Duration:   duration,
		Timestamp:  time.Now().Unix(),
	}
}


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
	minTestDuration := 3 * time.Second // Minimum test duration
	maxTestDuration := testDuration     // Maximum test duration

	var totalBytes int64
	chunkSize := initialChunkSize
	var currentThroughput float64
	var previousThroughput float64
	var speedSamples []float64
	var recentSamples []float64 // Last 5 samples for stability check
	var earlyStop bool

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

				// Calculate current throughput and collect samples
				elapsed := time.Since(startTime).Seconds()
				if elapsed > 0 {
					currentThroughput = utils.CalculateThroughput(atomic.LoadInt64(&totalBytes), elapsed)
					// Collect speed samples every 500ms for variance calculation
					if len(speedSamples) == 0 || int(elapsed*1000)%500 < 100 {
						speedSamples = append(speedSamples, currentThroughput)
						// Keep last 5 samples for stability check
						recentSamples = append(recentSamples, currentThroughput)
						if len(recentSamples) > 5 {
							recentSamples = recentSamples[len(recentSamples)-5:]
						}
					}
					
					// Check for early stop if speed stabilized
					elapsedDuration := time.Since(startTime)
					if elapsedDuration >= minTestDuration && len(recentSamples) >= 5 {
						if utils.IsSpeedStable(recentSamples, 5, 0.1) {
							s.logger.Info("Upload speed stabilized, stopping test early",
								zap.Float64("throughput", currentThroughput),
								zap.Duration("duration", elapsedDuration),
							)
							earlyStop = true
							done = true
							break
						}
					}
				}

				// Adaptive chunk size adjustment every 1 second (faster adaptation)
				if time.Since(lastAdaptationTime) >= 1*time.Second {
					// Calculate speed change
					speedChange := 0.0
					if previousThroughput > 0 {
						speedChange = (currentThroughput - previousThroughput) / previousThroughput
					}
					
					// Use progressive chunk size adjustment
					newChunkSize := utils.ProgressiveChunkSize(minChunkSize, chunkSize, maxChunkSize, speedChange)
					if newChunkSize != chunkSize {
						s.logger.Info("Adapting upload chunk size",
							zap.Int("oldChunkSize", chunkSize),
							zap.Int("newChunkSize", newChunkSize),
							zap.Float64("throughput", currentThroughput),
							zap.Float64("speedChange", speedChange),
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
					previousThroughput = currentThroughput
					lastAdaptationTime = time.Now()
				}
			}
		}
	}()

	// Wait for test duration or early stop
	select {
	case <-time.After(maxTestDuration):
		// Maximum duration reached
		done = true
	case <-time.After(100 * time.Millisecond):
		// Check if early stop was triggered
		if earlyStop {
			done = true
		}
	}
	
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

	// Calculate speed variance
	speedVariance := utils.CalculateVariance(speedSamples)

	s.logger.Info("Upload test completed",
		zap.Float64("throughput", finalThroughput),
		zap.Int64("bytes", atomic.LoadInt64(&totalBytes)),
		zap.Float64("duration", duration),
		zap.Float64("speedVariance", speedVariance),
		zap.Int("chunks", sequence),
	)

	return &models.UploadResult{
		Type:          "result",
		Throughput:    finalThroughput,
		Bytes:         atomic.LoadInt64(&totalBytes),
		Duration:      duration,
		SpeedVariance: speedVariance,
		SpeedSamples:  speedSamples,
		Timestamp:     time.Now().Unix(),
	}
}

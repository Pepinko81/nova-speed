package services

import (
	"sync"
	"sync/atomic"
	"time"

	"nova-speed/backend/internal/models"
	"nova-speed/backend/internal/utils"

	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

type DownloadService struct {
	logger *zap.Logger
}

func NewDownloadService(logger *zap.Logger) *DownloadService {
	return &DownloadService{
		logger: logger,
	}
}

// RunTest executes a download throughput test with parallel streams
func (s *DownloadService) RunTest(c *websocket.Conn, initialChunkSize int) *models.DownloadResult {
	const (
		testDuration    = 10 * time.Second // 10 second test
		minChunkSize    = 64 * 1024        // 64 KB minimum
		maxChunkSize    = 10 * 1024 * 1024 // 10 MB maximum
		maxParallelStreams = 8
	)

	if initialChunkSize < minChunkSize {
		initialChunkSize = minChunkSize
	}
	if initialChunkSize > maxChunkSize {
		initialChunkSize = maxChunkSize
	}

	startTime := time.Now()
	endTime := startTime.Add(testDuration)

	var totalBytes int64
	var currentThroughput float64
	var wg sync.WaitGroup
	var mu sync.Mutex

	// Start with 1 stream, will adapt based on performance
	numStreams := 1
	chunkSize := initialChunkSize

	// Channel to signal when to stop
	stopChan := make(chan struct{})
	defer close(stopChan)

	// Adaptive streaming: adjust chunk size and streams based on performance
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	go func() {
		for {
			select {
			case <-ticker.C:
				mu.Lock()
				// Adapt chunk size based on current throughput
				newChunkSize := utils.AdaptiveChunkSize(currentThroughput, minChunkSize, maxChunkSize)
				newNumStreams := utils.CalculateOptimalParallelStreams(currentThroughput)
				
				if newChunkSize != chunkSize || newNumStreams != numStreams {
					s.logger.Info("Adapting download parameters",
						zap.Int("oldChunkSize", chunkSize),
						zap.Int("newChunkSize", newChunkSize),
						zap.Int("oldStreams", numStreams),
						zap.Int("newStreams", newNumStreams),
						zap.Float64("throughput", currentThroughput),
					)
					chunkSize = newChunkSize
					numStreams = newNumStreams
				}
				mu.Unlock()
			case <-stopChan:
				return
			}
		}
	}()

	// Run parallel download streams
	streamFunc := func(streamID int) {
		defer wg.Done()
		localBytes := int64(0)
		sequence := 0

		for {
			select {
			case <-stopChan:
				return
			default:
				if time.Now().After(endTime) {
					return
				}

				mu.Lock()
				currentChunkSize := chunkSize
				mu.Unlock()

				// Generate random payload to prevent caching
				payload, err := utils.GenerateRandomPayload(currentChunkSize)
				if err != nil {
					s.logger.Error("Failed to generate payload", zap.Error(err))
					return
				}

				// Send binary payload directly (more efficient)
				// The client can track sequence by counting received chunks
				if err := c.WriteMessage(websocket.BinaryMessage, payload); err != nil {
					s.logger.Error("Failed to send chunk data", zap.Error(err))
					return
				}

				localBytes += int64(len(payload))
				sequence++

				// Update total bytes atomically
				atomic.AddInt64(&totalBytes, int64(len(payload)))

				// Calculate current throughput periodically
				elapsed := time.Since(startTime).Seconds()
				if elapsed > 0 {
					mu.Lock()
					currentThroughput = utils.CalculateThroughput(atomic.LoadInt64(&totalBytes), elapsed)
					mu.Unlock()
				}
			}
		}
	}

	// Start parallel streams
	for i := 0; i < numStreams; i++ {
		wg.Add(1)
		go streamFunc(i)
	}

	// Wait for test duration
	<-time.After(testDuration)
	stopChan <- struct{}{}

	// Wait for all streams to finish
	wg.Wait()

	duration := time.Since(startTime).Seconds()
	
	// Ensure minimum duration for accurate measurement
	if duration < 0.1 {
		duration = 0.1
	}
	
	finalThroughput := utils.CalculateThroughput(atomic.LoadInt64(&totalBytes), duration)
	
	// Validate throughput - cap unrealistic values (likely localhost loopback)
	if finalThroughput > 10000 {
		s.logger.Warn("Unrealistic throughput detected, likely localhost loopback",
			zap.Float64("throughput", finalThroughput),
			zap.Int64("bytes", atomic.LoadInt64(&totalBytes)),
			zap.Float64("duration", duration))
		finalThroughput = 10000
	}

	s.logger.Info("Download test completed",
		zap.Float64("throughput", finalThroughput),
		zap.Int64("bytes", atomic.LoadInt64(&totalBytes)),
		zap.Float64("duration", duration),
		zap.Int("streams", numStreams),
	)

	return &models.DownloadResult{
		Type:       "result",
		Throughput: finalThroughput,
		Bytes:      atomic.LoadInt64(&totalBytes),
		Duration:   duration,
		Timestamp:  time.Now().Unix(),
	}
}


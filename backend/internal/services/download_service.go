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
	firstByteTime := time.Time{}
	ttfbMeasured := false
	minTestDuration := 3 * time.Second // Minimum test duration
	maxTestDuration := testDuration     // Maximum test duration

	var totalBytes int64
	var currentThroughput float64
	var previousThroughput float64
	var speedSamples []float64
	var recentSamples []float64 // Last 5 samples for stability check
	var wg sync.WaitGroup
	var mu sync.Mutex

	// Start with 1 stream, will adapt based on performance
	numStreams := 1
	chunkSize := initialChunkSize

	// Channel to signal when to stop
	stopChan := make(chan struct{})
	defer close(stopChan)

	// Adaptive streaming: adjust chunk size and streams based on performance
	ticker := time.NewTicker(1 * time.Second) // Check every second for faster adaptation
	defer ticker.Stop()

	go func() {
		for {
			select {
			case <-ticker.C:
				mu.Lock()
				elapsed := time.Since(startTime)
				
				// Only check stability after minimum duration
				if elapsed >= minTestDuration && len(recentSamples) >= 5 {
					// Check if speed has stabilized
					if utils.IsSpeedStable(recentSamples, 5, 0.1) { // 10% max variation
					s.logger.Info("Speed stabilized, stopping test early",
						zap.Float64("throughput", currentThroughput),
						zap.Duration("duration", elapsed),
					)
					stopChan <- struct{}{}
						mu.Unlock()
						return
					}
				}
				
				// Adapt chunk size progressively based on speed change
				speedChange := 0.0
				if previousThroughput > 0 {
					speedChange = (currentThroughput - previousThroughput) / previousThroughput
				}
				
				// Use progressive chunk size adjustment
				newChunkSize := utils.ProgressiveChunkSize(minChunkSize, chunkSize, maxChunkSize, speedChange)
				newNumStreams := utils.CalculateOptimalParallelStreams(currentThroughput)
				
				// Only adapt if significant change
				if newChunkSize != chunkSize || newNumStreams != numStreams {
					s.logger.Info("Adapting download parameters",
						zap.Int("oldChunkSize", chunkSize),
						zap.Int("newChunkSize", newChunkSize),
						zap.Int("oldStreams", numStreams),
						zap.Int("newStreams", newNumStreams),
						zap.Float64("throughput", currentThroughput),
						zap.Float64("speedChange", speedChange),
					)
					chunkSize = newChunkSize
					numStreams = newNumStreams
				}
				
				previousThroughput = currentThroughput
				mu.Unlock()
			case <-stopChan:
				return
			default:
				if time.Now().After(endTime) {
					stopChan <- struct{}{}
					return
				}
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

				// Measure TTFB on first chunk
				if !ttfbMeasured && len(payload) > 0 {
					mu.Lock()
					if !ttfbMeasured {
						firstByteTime = time.Now()
						ttfbMeasured = true
					}
					mu.Unlock()
				}

				// Calculate current throughput periodically and collect samples
				elapsed := time.Since(startTime).Seconds()
				if elapsed > 0 {
					mu.Lock()
					currentThroughput = utils.CalculateThroughput(atomic.LoadInt64(&totalBytes), elapsed)
					// Collect speed samples every 500ms for variance calculation
					if len(speedSamples) == 0 || time.Since(startTime).Milliseconds()%500 < 100 {
						speedSamples = append(speedSamples, currentThroughput)
						// Keep last 5 samples for stability check
						recentSamples = append(recentSamples, currentThroughput)
						if len(recentSamples) > 5 {
							recentSamples = recentSamples[len(recentSamples)-5:]
						}
					}
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

	// Wait for test duration or early stop
	select {
	case <-time.After(maxTestDuration):
		// Maximum duration reached
		stopChan <- struct{}{}
	case <-stopChan:
		// Early stop due to stability
		break
	}

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

	// Calculate TTFB
	var ttfb float64
	if !firstByteTime.IsZero() {
		ttfb = float64(firstByteTime.Sub(startTime).Nanoseconds()) / 1_000_000.0 // Convert to milliseconds
	}

	// Calculate speed variance
	speedVariance := utils.CalculateVariance(speedSamples)

	s.logger.Info("Download test completed",
		zap.Float64("throughput", finalThroughput),
		zap.Int64("bytes", atomic.LoadInt64(&totalBytes)),
		zap.Float64("duration", duration),
		zap.Float64("ttfb", ttfb),
		zap.Float64("speedVariance", speedVariance),
		zap.Int("streams", numStreams),
	)

	return &models.DownloadResult{
		Type:          "result",
		Throughput:    finalThroughput,
		Bytes:         atomic.LoadInt64(&totalBytes),
		Duration:      duration,
		TTFB:          ttfb,
		SpeedVariance: speedVariance,
		SpeedSamples:  speedSamples,
		Timestamp:     time.Now().Unix(),
	}
}


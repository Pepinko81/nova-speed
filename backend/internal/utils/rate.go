package utils

import (
	"math"
)

// BitsPerSecondToMbps converts bits per second to Megabits per second
func BitsPerSecondToMbps(bps float64) float64 {
	return bps / 1_000_000.0
}

// BytesPerSecondToMbps converts bytes per second to Megabits per second
func BytesPerSecondToMbps(bytesPerSec float64) float64 {
	return (bytesPerSec * 8) / 1_000_000.0
}

// MbpsToGbps converts Megabits per second to Gigabits per second
func MbpsToGbps(mbps float64) float64 {
	return mbps / 1000.0
}

// FormatSpeed formats speed in Mbps or Gbps based on value
func FormatSpeed(mbps float64) (float64, string) {
	if mbps >= 1000 {
		return MbpsToGbps(mbps), "Gbps"
	}
	return mbps, "Mbps"
}

// CalculateThroughput calculates throughput in Mbps from bytes and duration
func CalculateThroughput(bytes int64, durationSeconds float64) float64 {
	if durationSeconds <= 0 {
		return 0
	}
	bytesPerSecond := float64(bytes) / durationSeconds
	return BytesPerSecondToMbps(bytesPerSecond)
}

// AdaptiveChunkSize calculates optimal chunk size based on current throughput
func AdaptiveChunkSize(currentMbps float64, minSize, maxSize int) int {
	// For very high speeds (1+ Gbps), use larger chunks
	if currentMbps >= 1000 {
		return maxSize
	}
	
	// For medium speeds (100-1000 Mbps), scale proportionally
	if currentMbps >= 100 {
		ratio := currentMbps / 1000.0
		size := int(float64(maxSize) * ratio)
		if size < minSize {
			return minSize
		}
		return size
	}
	
	// For lower speeds, use minimum chunk size
	return minSize
}

// CalculateOptimalParallelStreams calculates optimal number of parallel streams
func CalculateOptimalParallelStreams(currentMbps float64) int {
	// For very high speeds (1+ Gbps), use more streams
	if currentMbps >= 1000 {
		return 8
	}
	
	// For high speeds (500-1000 Mbps), use 4 streams
	if currentMbps >= 500 {
		return 4
	}
	
	// For medium speeds (100-500 Mbps), use 2 streams
	if currentMbps >= 100 {
		return 2
	}
	
	// For lower speeds, use 1 stream
	return 1
}

// CalculateJitter calculates jitter from latency measurements
func CalculateJitter(latencies []float64) float64 {
	if len(latencies) < 2 {
		return 0
	}
	
	var sum float64
	for i := 1; i < len(latencies); i++ {
		diff := math.Abs(latencies[i] - latencies[i-1])
		sum += diff
	}
	
	return sum / float64(len(latencies)-1)
}

// CalculateAverageLatency calculates average latency
func CalculateAverageLatency(latencies []float64) float64 {
	if len(latencies) == 0 {
		return 0
	}
	
	var sum float64
	for _, lat := range latencies {
		sum += lat
	}
	
	return sum / float64(len(latencies))
}

// CalculatePacketLoss calculates packet loss percentage
func CalculatePacketLoss(sent, received int) float64 {
	if sent == 0 {
		return 0
	}
	loss := float64(sent-received) / float64(sent) * 100.0
	if loss < 0 {
		return 0
	}
	return loss
}

// CalculateMinMaxLatency calculates minimum and maximum latency
func CalculateMinMaxLatency(latencies []float64) (min, max float64) {
	if len(latencies) == 0 {
		return 0, 0
	}
	min = latencies[0]
	max = latencies[0]
	for _, lat := range latencies {
		if lat < min {
			min = lat
		}
		if lat > max {
			max = lat
		}
	}
	return min, max
}

// CalculateVariance calculates variance of speed measurements
func CalculateVariance(samples []float64) float64 {
	if len(samples) < 2 {
		return 0
	}
	
	// Calculate mean
	var sum float64
	for _, s := range samples {
		sum += s
	}
	mean := sum / float64(len(samples))
	
	// Calculate variance
	var varianceSum float64
	for _, s := range samples {
		diff := s - mean
		varianceSum += diff * diff
	}
	
	return varianceSum / float64(len(samples))
}

// CalculateStabilityScore calculates connection stability score (0-100)
func CalculateStabilityScore(packetLoss, jitter, speedVariance float64, avgLatency float64) float64 {
	score := 100.0
	
	// Penalize packet loss (each 1% = -5 points)
	score -= packetLoss * 5
	if score < 0 {
		score = 0
	}
	
	// Penalize high jitter (each 10ms = -2 points, max -20)
	jitterPenalty := math.Min(jitter/10.0*2.0, 20.0)
	score -= jitterPenalty
	
	// Penalize high speed variance (each 10% variance = -1 point, max -15)
	variancePenalty := math.Min(speedVariance/10.0, 15.0)
	score -= variancePenalty
	
	// Bonus for low latency (< 20ms = +5 points)
	if avgLatency > 0 && avgLatency < 20 {
		score += 5
	}
	
	// Ensure score is between 0 and 100
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}
	
	return score
}

// IsSpeedStable checks if speed has stabilized based on recent samples
// Returns true if the coefficient of variation is below threshold
func IsSpeedStable(samples []float64, minSamples int, maxVariation float64) bool {
	if len(samples) < minSamples {
		return false
	}
	
	// Calculate mean
	var sum float64
	for _, s := range samples {
		sum += s
	}
	mean := sum / float64(len(samples))
	
	if mean == 0 {
		return false
	}
	
	// Calculate standard deviation
	var varianceSum float64
	for _, s := range samples {
		diff := s - mean
		varianceSum += diff * diff
	}
	variance := varianceSum / float64(len(samples))
	stdDev := math.Sqrt(variance)
	
	// Coefficient of variation (CV) = stdDev / mean
	cv := stdDev / mean
	
	// Speed is stable if CV is below threshold (e.g., 0.1 = 10% variation)
	return cv <= maxVariation
}

// ProgressiveChunkSize calculates chunk size that progressively increases
func ProgressiveChunkSize(initialSize, currentSize, maxSize int, speedIncrease float64) int {
	// If speed increased significantly, increase chunk size
	if speedIncrease > 0.2 { // 20% increase
		newSize := int(float64(currentSize) * 1.5)
		if newSize > maxSize {
			return maxSize
		}
		if newSize < initialSize {
			return initialSize
		}
		return newSize
	}
	
	// If speed decreased, reduce chunk size
	if speedIncrease < -0.2 { // 20% decrease
		newSize := int(float64(currentSize) * 0.75)
		if newSize < initialSize {
			return initialSize
		}
		return newSize
	}
	
	// Otherwise keep current size
	return currentSize
}


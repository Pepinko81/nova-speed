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


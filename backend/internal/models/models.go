package models

import "time"

// TestResult represents the result of a speed test
type TestResult struct {
	Latency   float64 `json:"latency"`   // in milliseconds
	Jitter    float64 `json:"jitter"`    // in milliseconds
	Download  float64 `json:"download"`  // in Mbps
	Upload    float64 `json:"upload"`    // in Mbps
	Timestamp int64   `json:"timestamp"` // Unix timestamp
}

// PingMessage represents a ping test message
type PingMessage struct {
	Type      string  `json:"type"`      // "ping" or "pong"
	Timestamp int64   `json:"timestamp"` // Unix timestamp in nanoseconds
	Sequence  int     `json:"sequence"` // Sequence number
}

// PingResult represents the result of a ping test
type PingResult struct {
	Type       string  `json:"type"`       // "result"
	Latency    float64 `json:"latency"`    // in milliseconds
	Jitter     float64 `json:"jitter"`     // in milliseconds
	Packets    int     `json:"packets"`    // Number of packets received
	PacketLoss float64 `json:"packetLoss"` // Packet loss percentage (0-100)
	MinLatency float64 `json:"minLatency"` // Minimum latency in ms
	MaxLatency float64 `json:"maxLatency"` // Maximum latency in ms
	Timestamp  int64   `json:"timestamp"`  // Unix timestamp
}

// DownloadMessage represents a download test message
type DownloadMessage struct {
	Type      string `json:"type"`      // "start", "chunk", "complete"
	ChunkSize int    `json:"chunkSize"` // Size of chunk in bytes
	Sequence  int    `json:"sequence"`  // Sequence number
}

// DownloadResult represents the result of a download test
type DownloadResult struct {
	Type         string    `json:"type"`         // "result"
	Throughput   float64   `json:"throughput"`   // in Mbps
	Bytes        int64     `json:"bytes"`        // Total bytes transferred
	Duration     float64   `json:"duration"`     // in seconds
	TTFB         float64   `json:"ttfb"`         // Time to First Byte in milliseconds
	SpeedVariance float64  `json:"speedVariance"` // Variance in speed measurements
	SpeedSamples []float64 `json:"speedSamples"`  // Speed samples for graphing (optional)
	Timestamp    int64     `json:"timestamp"`     // Unix timestamp
}

// UploadMessage represents an upload test message
type UploadMessage struct {
	Type      string `json:"type"`      // "start", "chunk", "complete"
	ChunkSize int    `json:"chunkSize"` // Size of chunk in bytes
	Sequence  int    `json:"sequence"`  // Sequence number
	Data      []byte `json:"data"`      // Binary data (base64 encoded in JSON)
}

// UploadResult represents the result of an upload test
type UploadResult struct {
	Type         string    `json:"type"`         // "result"
	Throughput   float64   `json:"throughput"`   // in Mbps
	Bytes        int64     `json:"bytes"`       // Total bytes transferred
	Duration     float64   `json:"duration"`     // in seconds
	SpeedVariance float64  `json:"speedVariance"` // Variance in speed measurements
	SpeedSamples []float64 `json:"speedSamples"`  // Speed samples for graphing (optional)
	Timestamp    int64     `json:"timestamp"`     // Unix timestamp
}

// ConnectionQuality represents overall connection quality metrics
type ConnectionQuality struct {
	StabilityScore float64 `json:"stabilityScore"` // 0-100 score
	IsStable       bool    `json:"isStable"`      // Whether connection is stable
	Recommendations []string `json:"recommendations"` // List of recommendations
}

// ErrorMessage represents an error message
type ErrorMessage struct {
	Type    string `json:"type"`    // "error"
	Message string `json:"message"` // Error message
}

// GetMonotonicTime returns the current monotonic time in nanoseconds
func GetMonotonicTime() int64 {
	return time.Now().UnixNano()
}

// GetMonotonicTimeMs returns the current monotonic time in milliseconds
func GetMonotonicTimeMs() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}


package services

import (
	"context"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"go.uber.org/zap"
)

type MetricsService struct {
	logger *zap.Logger
}

func NewMetricsService(logger *zap.Logger) *MetricsService {
	return &MetricsService{
		logger: logger,
	}
}

// LogCPUUsage logs current CPU usage
func (s *MetricsService) LogCPUUsage(ctx context.Context) {
	percentages, err := cpu.PercentWithContext(ctx, time.Second, false)
	if err != nil {
		s.logger.Warn("Failed to get CPU usage", zap.Error(err))
		return
	}

	if len(percentages) > 0 {
		s.logger.Info("CPU Usage",
			zap.Float64("percent", percentages[0]),
		)
	}
}

// LogTraffic logs traffic statistics
func (s *MetricsService) LogTraffic(bytesTransferred int64, direction string, duration float64) {
	throughput := float64(bytesTransferred) / duration
	s.logger.Info("Traffic Statistics",
		zap.String("direction", direction),
		zap.Int64("bytes", bytesTransferred),
		zap.Float64("duration", duration),
		zap.Float64("throughput_bytes_per_sec", throughput),
	)
}


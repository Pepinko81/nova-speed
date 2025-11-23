/**
 * WebWorker for Speed Test Data Processing
 * Prevents UI freezing during heavy calculations
 */

import { TestProgress } from '../lib/speedtest-client';

export interface WorkerMessage {
  type: 'process' | 'calculate' | 'done';
  data?: any;
}

// Process speed samples and calculate statistics
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  switch (type) {
    case 'process':
      // Process speed samples for graphing
      if (data && data.samples) {
        const samples = data.samples as number[];
        const processed = processSamples(samples);
        self.postMessage({
          type: 'processed',
          data: processed,
        });
      }
      break;

    case 'calculate':
      // Calculate statistics from samples
      if (data && data.samples) {
        const samples = data.samples as number[];
        const stats = calculateStats(samples);
        self.postMessage({
          type: 'stats',
          data: stats,
        });
      }
      break;

    default:
      break;
  }
};

function processSamples(samples: number[]): number[] {
  // Smooth samples for better visualization
  if (samples.length < 2) return samples;
  
  const smoothed: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (i === 0 || i === samples.length - 1) {
      smoothed.push(samples[i]);
    } else {
      // Moving average with window of 3
      const avg = (samples[i - 1] + samples[i] + samples[i + 1]) / 3;
      smoothed.push(avg);
    }
  }
  return smoothed;
}

function calculateStats(samples: number[]): {
  mean: number;
  median: number;
  min: number;
  max: number;
  variance: number;
} {
  if (samples.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, variance: 0 };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  const mean = sum / samples.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  const variance = samples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / samples.length;

  return { mean, median, min, max, variance };
}


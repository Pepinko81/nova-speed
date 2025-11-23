/**
 * Real-World Test Scenarios
 */

import { PingResult, DownloadResult, UploadResult, ConnectionQuality } from './speedtest-client';

export interface StreamingTestResult {
  canStream1080p: boolean;
  canStream4K: boolean;
  recommendedQuality: '480p' | '720p' | '1080p' | '4K';
  score: number;
  message: string;
}

export interface GamingTestResult {
  suitable: boolean;
  latencyScore: number; // 0-100
  jitterScore: number; // 0-100
  packetLossScore: number; // 0-100
  overallScore: number; // 0-100
  message: string;
  recommendations: string[];
}

export interface VideoCallTestResult {
  suitable: boolean;
  uploadScore: number; // 0-100
  latencyScore: number; // 0-100
  stabilityScore: number; // 0-100
  overallScore: number; // 0-100
  message: string;
  recommendations: string[];
}

export const testStreaming = (
  download: DownloadResult,
  ping: PingResult
): StreamingTestResult => {
  const downloadMbps = download.throughput;
  const latency = ping.latency;
  
  // Requirements:
  // 480p: 3 Mbps
  // 720p: 5 Mbps
  // 1080p: 25 Mbps
  // 4K: 50 Mbps
  
  const canStream1080p = downloadMbps >= 25 && latency < 100;
  const canStream4K = downloadMbps >= 50 && latency < 100;
  
  let recommendedQuality: '480p' | '720p' | '1080p' | '4K' = '480p';
  if (canStream4K) {
    recommendedQuality = '4K';
  } else if (canStream1080p) {
    recommendedQuality = '1080p';
  } else if (downloadMbps >= 5) {
    recommendedQuality = '720p';
  }
  
  const score = Math.min(100, (downloadMbps / 50) * 100);
  
  let message = '';
  if (canStream4K) {
    message = 'Отлично! Можете да гледате 4K streaming без проблеми.';
  } else if (canStream1080p) {
    message = 'Добре! Можете да гледате 1080p streaming.';
  } else if (downloadMbps >= 5) {
    message = 'Можете да гледате 720p streaming.';
  } else {
    message = 'Нисък download - препоръчваме 480p или по-ниско качество.';
  }
  
  return {
    canStream1080p,
    canStream4K,
    recommendedQuality,
    score: Math.round(score),
    message,
  };
};

export const testGaming = (
  ping: PingResult,
  download: DownloadResult
): GamingTestResult => {
  const latency = ping.latency;
  const jitter = ping.jitter;
  const packetLoss = ping.packetLoss || 0;
  const downloadMbps = download.throughput;
  
  // Gaming requirements:
  // Latency: < 20ms excellent, < 50ms good, < 100ms acceptable
  // Jitter: < 10ms excellent, < 20ms good, < 30ms acceptable
  // Packet Loss: < 1% excellent, < 3% good, < 5% acceptable
  // Download: > 3 Mbps minimum
  
  const latencyScore = Math.max(0, 100 - (latency / 100) * 100);
  const jitterScore = Math.max(0, 100 - (jitter / 30) * 100);
  const packetLossScore = Math.max(0, 100 - (packetLoss / 5) * 100);
  
  const overallScore = (latencyScore * 0.5 + jitterScore * 0.3 + packetLossScore * 0.2);
  
  const suitable = latency < 100 && jitter < 30 && packetLoss < 5 && downloadMbps >= 3;
  
  const recommendations: string[] = [];
  if (latency >= 100) {
    recommendations.push('Висока латентност - не е подходящо за gaming');
  } else if (latency >= 50) {
    recommendations.push('Приемлива латентност - може да забележите забавяне');
  }
  
  if (jitter >= 30) {
    recommendations.push('Висок jitter - нестабилна връзка за gaming');
  } else if (jitter >= 20) {
    recommendations.push('Повишен jitter - може да забележите нестабилност');
  }
  
  if (packetLoss >= 5) {
    recommendations.push('Висок packet loss - проблеми с връзката');
  } else if (packetLoss >= 3) {
    recommendations.push('Повишен packet loss - може да има проблеми');
  }
  
  if (downloadMbps < 3) {
    recommendations.push('Нисък download - може да има проблеми с обновленията');
  }
  
  if (suitable && latency < 20 && jitter < 10 && packetLoss < 1) {
    recommendations.push('Отлична връзка за gaming!');
  } else if (suitable) {
    recommendations.push('Добра връзка за gaming');
  }
  
  let message = '';
  if (suitable && latency < 20) {
    message = 'Отлично за gaming - ниска латентност и стабилна връзка';
  } else if (suitable) {
    message = 'Подходящо за gaming - приемлива латентност';
  } else {
    message = 'Не е оптимално за gaming - висока латентност или нестабилност';
  }
  
  return {
    suitable,
    latencyScore: Math.round(latencyScore),
    jitterScore: Math.round(jitterScore),
    packetLossScore: Math.round(packetLossScore),
    overallScore: Math.round(overallScore),
    message,
    recommendations,
  };
};

export const testVideoCall = (
  upload: UploadResult,
  ping: PingResult,
  quality: ConnectionQuality
): VideoCallTestResult => {
  const uploadMbps = upload.throughput;
  const latency = ping.latency;
  const stability = quality.stabilityScore;
  
  // Video call requirements:
  // Upload: > 1.5 Mbps for HD, > 0.5 Mbps for SD
  // Latency: < 100ms for good quality
  // Stability: > 70 for good quality
  
  const uploadScore = Math.min(100, (uploadMbps / 1.5) * 100);
  const latencyScore = Math.max(0, 100 - (latency / 200) * 100);
  const stabilityScore = stability;
  
  const overallScore = (uploadScore * 0.4 + latencyScore * 0.3 + stabilityScore * 0.3);
  
  const suitable = uploadMbps >= 1.5 && latency < 100 && stability >= 70;
  
  const recommendations: string[] = [];
  if (uploadMbps < 1.5) {
    recommendations.push('Нисък upload - препоръчваме поне 1.5 Mbps за HD video calls');
  } else if (uploadMbps < 0.5) {
    recommendations.push('Много нисък upload - може да има проблеми с video calls');
  }
  
  if (latency >= 100) {
    recommendations.push('Висока латентност - може да има забавяне в video calls');
  }
  
  if (stability < 70) {
    recommendations.push('Нестабилна връзка - може да има прекъсвания');
  }
  
  if (suitable) {
    recommendations.push('Подходящо за HD video calls');
  }
  
  let message = '';
  if (suitable && uploadMbps >= 2 && latency < 50) {
    message = 'Отлично за video calls - висок upload и ниска латентност';
  } else if (suitable) {
    message = 'Подходящо за video calls';
  } else {
    message = 'Не е оптимално за video calls - нисък upload или висока латентност';
  }
  
  return {
    suitable,
    uploadScore: Math.round(uploadScore),
    latencyScore: Math.round(latencyScore),
    stabilityScore: Math.round(stabilityScore),
    overallScore: Math.round(overallScore),
    message,
    recommendations,
  };
};


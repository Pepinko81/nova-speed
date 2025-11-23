/**
 * Connection Diagnostics and Recommendations
 */

import { PingResult, DownloadResult, UploadResult, ConnectionQuality } from './speedtest-client';

export const calculateConnectionQuality = (
  ping: PingResult,
  download: DownloadResult,
  upload: UploadResult
): ConnectionQuality => {
  const recommendations: string[] = [];
  let stabilityScore = 100;

  // Check packet loss (each 1% = -5 points, max -50 points)
  if (ping.packetLoss && ping.packetLoss > 0) {
    const packetLossPenalty = Math.min(ping.packetLoss * 5, 50);
    stabilityScore -= packetLossPenalty;
    if (ping.packetLoss > 5) {
      recommendations.push('Висок packet loss - проверете кабелното свързване или Wi-Fi сигнала');
    } else if (ping.packetLoss > 1) {
      recommendations.push('Има загуба на пакети - може да има проблеми със стабилността');
    }
  }

  // Check jitter (each 10ms above 20 = -2 points, max -20 points)
  if (ping.jitter > 20) {
    const jitterPenalty = Math.min((ping.jitter - 20) / 10 * 2, 20);
    stabilityScore -= jitterPenalty;
    if (ping.jitter > 50) {
      recommendations.push('Висок jitter - не е подходящо за gaming или video calls');
    } else {
      recommendations.push('Повишен jitter - може да забележите забавяне при gaming');
    }
  }

  // Check latency (each 10ms above 100 = -1 point, max -20 points)
  if (ping.latency > 100) {
    const latencyPenalty = Math.min((ping.latency - 100) / 10, 20);
    stabilityScore -= latencyPenalty;
    if (ping.latency > 200) {
      recommendations.push('Висока латентност - не е подходящо за gaming или real-time приложения');
    }
  }

  // Check speed variance - convert to coefficient of variation (CV) percentage
  // CV = (stdDev / mean) * 100, where variance = stdDev^2
  // We need to calculate CV from variance and mean speed
  if (download.speedVariance && download.speedVariance > 0 && download.throughput > 0) {
    // Calculate coefficient of variation: CV = sqrt(variance) / mean * 100
    const stdDev = Math.sqrt(download.speedVariance);
    const cv = (stdDev / download.throughput) * 100;
    
    // Penalize high CV (each 10% CV above 20% = -2 points, max -15 points)
    if (cv > 20) {
      const variancePenalty = Math.min((cv - 20) / 10 * 2, 15);
      stabilityScore -= variancePenalty;
      if (cv > 50) {
        recommendations.push('Много нестабилна download скорост - проверете Wi-Fi или кабелното свързване');
      } else {
        recommendations.push('Нестабилна download скорост - проверете Wi-Fi или кабелното свързване');
      }
    }
  }

  if (upload.speedVariance && upload.speedVariance > 0 && upload.throughput > 0) {
    // Calculate coefficient of variation: CV = sqrt(variance) / mean * 100
    const stdDev = Math.sqrt(upload.speedVariance);
    const cv = (stdDev / upload.throughput) * 100;
    
    // Penalize high CV (each 10% CV above 20% = -2 points, max -15 points)
    if (cv > 20) {
      const variancePenalty = Math.min((cv - 20) / 10 * 2, 15);
      stabilityScore -= variancePenalty;
      if (cv > 50) {
        recommendations.push('Много нестабилна upload скорост - може да има проблеми с рутера');
      } else {
        recommendations.push('Нестабилна upload скорост - може да има проблеми с рутера');
      }
    }
  }

  // Check TTFB (each 100ms above 500 = -2 points, max -10 points)
  if (download.ttfb && download.ttfb > 500) {
    const ttfbPenalty = Math.min((download.ttfb - 500) / 100 * 2, 10);
    stabilityScore -= ttfbPenalty;
    if (download.ttfb > 1000) {
      recommendations.push('Много високо време до първи байт - сървърът може да е далеч или натоварен');
    } else {
      recommendations.push('Високо време до първи байт - сървърът може да е далеч или натоварен');
    }
  }
  
  // Bonus for excellent connection
  if (ping.latency < 20 && ping.jitter < 10 && (!ping.packetLoss || ping.packetLoss < 0.5)) {
    stabilityScore += 5; // Bonus for excellent connection
  }

  // Check if connection is suitable for different use cases
  const isStable = stabilityScore >= 70 && 
                   (ping.packetLoss === undefined || ping.packetLoss < 2) &&
                   ping.jitter < 30;

  // Add positive recommendations
  if (isStable && ping.latency < 30) {
    recommendations.push('Отлична връзка - подходяща за gaming, streaming и video calls');
  } else if (isStable) {
    recommendations.push('Стабилна връзка - подходяща за повечето приложения');
  }

  // Streaming recommendations
  if (download.throughput >= 25) {
    recommendations.push('Подходящо за 4K streaming');
  } else if (download.throughput >= 5) {
    recommendations.push('Подходящо за HD streaming (1080p)');
  } else if (download.throughput < 3) {
    recommendations.push('Нисък download - може да има проблеми със streaming');
  }

  // Gaming recommendations
  if (ping.latency < 20 && ping.jitter < 10 && (ping.packetLoss === undefined || ping.packetLoss < 1)) {
    recommendations.push('Отлично за gaming - ниска латентност и стабилна връзка');
  } else if (ping.latency < 50 && ping.jitter < 20) {
    recommendations.push('Добро за gaming - приемлива латентност');
  } else {
    recommendations.push('Не е оптимално за gaming - висока латентност или нестабилност');
  }

  // Video call recommendations
  if (upload.throughput >= 1.5 && ping.latency < 100 && ping.jitter < 30) {
    recommendations.push('Подходящо за video calls');
  } else if (upload.throughput < 1) {
    recommendations.push('Нисък upload - може да има проблеми с video calls');
  }

  // Ensure score is between 0 and 100
  stabilityScore = Math.max(0, Math.min(100, Math.round(stabilityScore)));

  return {
    stabilityScore,
    isStable,
    recommendations: [...new Set(recommendations)], // Remove duplicates
  };
};

export const getOperatorName = (isp?: string): string => {
  if (!isp) return 'Неизвестен';
  
  const ispLower = isp.toLowerCase();
  
  // Vivacom / BTC (Bulgarian Telecommunications Company)
  if (
    ispLower.includes('vivacom') ||
    ispLower.includes('btc') ||
    ispLower.includes('bulgarian telecommunications') ||
    ispLower.includes('bulgaria telecom') ||
    ispLower.includes('bt group') ||
    ispLower.includes('as8866') ||
    ispLower.includes('as13132')
  ) {
    return 'Vivacom';
  }
  
  // A1 / Mtel
  if (
    ispLower.includes('a1') ||
    ispLower.includes('mtel') ||
    ispLower.includes('mobiltel') ||
    ispLower.includes('mobil tel') ||
    ispLower.includes('a1 bulgaria') ||
    ispLower.includes('telekom austria') ||
    ispLower.includes('as8866') && ispLower.includes('mobile')
  ) {
    return 'A1';
  }
  
  // Yettel / Telenor
  if (
    ispLower.includes('yettel') ||
    ispLower.includes('telenor') ||
    ispLower.includes('globul') ||
    ispLower.includes('cosmo') ||
    ispLower.includes('telenor bulgaria') ||
    ispLower.includes('yettel bulgaria')
  ) {
    return 'Yettel';
  }
  
  // Bulsatcom
  if (
    ispLower.includes('bulsatcom') ||
    ispLower.includes('bulsat') ||
    ispLower.includes('bulsat com')
  ) {
    return 'Bulsatcom';
  }
  
  // Blizoo
  if (
    ispLower.includes('blizoo') ||
    ispLower.includes('blizoo bg')
  ) {
    return 'Blizoo';
  }
  
  // Net1 / Net1.bg
  if (
    ispLower.includes('net1') ||
    ispLower.includes('net1.bg')
  ) {
    return 'Net1';
  }
  
  // BORNET
  if (ispLower.includes('bornet')) {
    return 'BORNET';
  }
  
  // Other Bulgarian ISPs
  if (ispLower.includes('cabletel')) {
    return 'Cabletel';
  }
  
  if (ispLower.includes('max telecom')) {
    return 'Max Telecom';
  }
  
  // Check if it's a Bulgarian IP but unknown operator
  // Return original ISP name if no match found
  return isp;
};

/**
 * Get operator logo/icon emoji (optional enhancement)
 */
export const getOperatorEmoji = (operator: string): string => {
  switch (operator) {
    case 'Vivacom':
      return '📡';
    case 'A1':
      return '📶';
    case 'Yettel':
      return '📱';
    case 'Bulsatcom':
      return '📺';
    case 'Blizoo':
      return '🌐';
    default:
      return '📡';
  }
};


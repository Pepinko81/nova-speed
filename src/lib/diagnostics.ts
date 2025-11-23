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

  // Check packet loss
  if (ping.packetLoss && ping.packetLoss > 0) {
    stabilityScore -= ping.packetLoss * 5;
    if (ping.packetLoss > 5) {
      recommendations.push('Висок packet loss - проверете кабелното свързване или Wi-Fi сигнала');
    } else if (ping.packetLoss > 1) {
      recommendations.push('Има загуба на пакети - може да има проблеми със стабилността');
    }
  }

  // Check jitter
  if (ping.jitter > 20) {
    stabilityScore -= (ping.jitter - 20) * 0.5;
    if (ping.jitter > 50) {
      recommendations.push('Висок jitter - не е подходящо за gaming или video calls');
    } else {
      recommendations.push('Повишен jitter - може да забележите забавяне при gaming');
    }
  }

  // Check latency
  if (ping.latency > 100) {
    stabilityScore -= (ping.latency - 100) * 0.2;
    if (ping.latency > 200) {
      recommendations.push('Висока латентност - не е подходящо за gaming или real-time приложения');
    }
  }

  // Check speed variance
  if (download.speedVariance && download.speedVariance > 20) {
    stabilityScore -= download.speedVariance * 0.3;
    recommendations.push('Нестабилна download скорост - проверете Wi-Fi или кабелното свързване');
  }

  if (upload.speedVariance && upload.speedVariance > 20) {
    stabilityScore -= upload.speedVariance * 0.3;
    recommendations.push('Нестабилна upload скорост - може да има проблеми с рутера');
  }

  // Check TTFB
  if (download.ttfb && download.ttfb > 500) {
    stabilityScore -= 10;
    recommendations.push('Високо време до първи байт - сървърът може да е далеч или натоварен');
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
  stabilityScore = Math.max(0, Math.min(100, stabilityScore));

  return {
    stabilityScore: Math.round(stabilityScore),
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


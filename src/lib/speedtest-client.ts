/**
 * SpeedTest Client - WebSocket client for connecting to the Nova Speed Test backend
 */

export interface PingResult {
  latency: number;
  jitter: number;
  packets: number;
  packetLoss?: number;
  minLatency?: number;
  maxLatency?: number;
}

export interface DownloadResult {
  throughput: number;
  bytes: number;
  duration: number;
  ttfb?: number;
  speedVariance?: number;
  speedSamples?: number[];
}

export interface UploadResult {
  throughput: number;
  bytes: number;
  duration: number;
  speedVariance?: number;
  speedSamples?: number[];
}

export interface ConnectionQuality {
  stabilityScore: number;
  isStable: boolean;
  recommendations: string[];
}

export interface TestHistoryEntry {
  id: string;
  timestamp: number;
  ping: number;
  jitter: number;
  packetLoss?: number;
  download: number;
  upload: number;
  ttfb?: number;
  speedVariance?: number;
  operator?: string;
  location?: string;
}

export interface TestProgress {
  test: 'ping' | 'download' | 'upload';
  value: number;
  unit: 'ms' | 'Mbps';
  timestamp?: number; // For real-time graphing
}

type ProgressCallback = (progress: TestProgress) => void;

export class SpeedTestClient {
  private wsBaseUrl: string;

  constructor(wsBaseUrl?: string) {
    // Determine WebSocket URL based on environment
    if (wsBaseUrl) {
      this.wsBaseUrl = wsBaseUrl;
    } else if (typeof window !== 'undefined') {
      // In browser, use same protocol as current page but for WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = import.meta.env.VITE_WS_PORT || (host.includes('hashmatrix.dev') ? '' : ':3001');
      this.wsBaseUrl = `${protocol}//${host}${port}`;
    } else {
      this.wsBaseUrl = 'ws://localhost:3001';
    }
  }

  /**
   * Run ping/latency test
   */
  async runPingTest(onProgress?: ProgressCallback): Promise<PingResult> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.wsBaseUrl}/ws/ping`);

      ws.onopen = () => {
        console.log('Ping test connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'ping') {
            // Echo back immediately as pong
            const pong = {
              type: 'pong',
              timestamp: message.timestamp,
              sequence: message.sequence,
            };
            ws.send(JSON.stringify(pong));

            if (onProgress) {
              onProgress({
                test: 'ping',
                value: 0,
                unit: 'ms',
              });
            }
          } else if (message.type === 'result') {
            const result: PingResult = {
              latency: message.latency,
              jitter: message.jitter,
              packets: message.packets,
              packetLoss: message.packetLoss,
              minLatency: message.minLatency,
              maxLatency: message.maxLatency,
            };
            resolve(result);
            ws.close();
          }
        } catch (error) {
          console.error('Error parsing ping message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Ping test WebSocket error:', error);
        reject(new Error('Failed to connect to ping test server'));
        ws.close();
      };

      ws.onclose = (event) => {
        if (event.code !== 1000 && event.code !== 1001) {
          reject(new Error(`Connection closed unexpectedly: ${event.code}`));
        }
      };
    });
  }

  /**
   * Run download throughput test
   */
  async runDownloadTest(
    onProgress?: ProgressCallback,
    maxSpeed: number = 1000
  ): Promise<DownloadResult> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.wsBaseUrl}/ws/download`);
      let bytesReceived = 0;
      let startTime: number | null = null;
      let lastUpdateTime = 0;

      ws.onopen = () => {
        console.log('Download test connected');
        startTime = performance.now();
        lastUpdateTime = startTime;
        // Send start message with initial chunk size
        ws.send(JSON.stringify({
          type: 'start',
          chunkSize: 256 * 1024, // 256 KB
        }));
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          // Binary data received
          bytesReceived += event.data.size;

          if (startTime) {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // seconds

            // Update progress every 100ms to avoid too many updates
            if (now - lastUpdateTime >= 100) {
              const mbps = (bytesReceived * 8) / (elapsed * 1_000_000);
              
              if (onProgress) {
                onProgress({
                  test: 'download',
                  value: Math.min(mbps, maxSpeed),
                  unit: 'Mbps',
                });
              }
              lastUpdateTime = now;
            }
          }
        } else {
          // JSON result message
          try {
            const result = JSON.parse(event.data);
            if (result.type === 'result') {
              const downloadResult: DownloadResult = {
                throughput: result.throughput,
                bytes: result.bytes,
                duration: result.duration,
                ttfb: result.ttfb,
                speedVariance: result.speedVariance,
                speedSamples: result.speedSamples,
              };
              resolve(downloadResult);
              ws.close();
            }
          } catch (error) {
            console.error('Error parsing download result:', error);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('Download test WebSocket error:', error);
        reject(new Error('Failed to connect to download test server'));
        ws.close();
      };

      ws.onclose = (event) => {
        if (event.code !== 1000 && event.code !== 1001) {
          reject(new Error(`Connection closed unexpectedly: ${event.code}`));
        }
      };
    });
  }

  /**
   * Run upload throughput test
   */
  async runUploadTest(
    onProgress?: ProgressCallback,
    maxSpeed: number = 1000
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.wsBaseUrl}/ws/upload`);
      let bytesSent = 0;
      let chunkSize = 256 * 1024; // 256 KB initial
      let startTime: number | null = null;
      const testDuration = 10000; // 10 seconds
      let animationFrameId: number | null = null;
      let lastUpdateTime = 0;

      // Throttle sending to prevent overwhelming the connection
      // Calculate target send rate based on reasonable max speed
      const targetMbps = Math.min(maxSpeed, 1000); // Cap at 1 Gbps for localhost detection
      const targetBytesPerSecond = (targetMbps * 1_000_000) / 8;
      const minInterval = Math.max(16, (chunkSize / targetBytesPerSecond) * 1000); // At least 16ms (60fps)
      
      let lastSendTime = 0;

      const sendChunk = () => {
        if (!startTime) return;

        const now = performance.now();
        const elapsed = now - startTime;

        if (elapsed >= testDuration) {
          // Send complete message
          ws.send(JSON.stringify({ type: 'complete' }));
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
          }
          return;
        }

        // Throttle sending to prevent too fast uploads (especially on localhost)
        if (now - lastSendTime < minInterval) {
          animationFrameId = requestAnimationFrame(sendChunk);
          return;
        }

        // Check if WebSocket is ready
        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }

        // Generate random binary data
        // crypto.getRandomValues has a limit of 65536 bytes, so we need to chunk it
        const buffer = new Uint8Array(chunkSize);
        const maxChunk = 65536; // Maximum bytes per getRandomValues call
        
        if (chunkSize <= maxChunk) {
          crypto.getRandomValues(buffer);
        } else {
          // Fill in chunks of maxChunk size
          for (let offset = 0; offset < chunkSize; offset += maxChunk) {
            const chunk = buffer.subarray(offset, Math.min(offset + maxChunk, chunkSize));
            crypto.getRandomValues(chunk);
          }
        }

        // Send binary data (with buffering check)
        try {
          if (ws.bufferedAmount < 10 * 1024 * 1024) { // Don't buffer more than 10MB
            ws.send(buffer);
            bytesSent += chunkSize;
            lastSendTime = now;
          }
        } catch (error) {
          console.error('Error sending chunk:', error);
          return;
        }

        // Update progress every 100ms
        if (now - lastUpdateTime >= 100) {
          const elapsedSeconds = elapsed / 1000;
          const mbps = (bytesSent * 8) / (elapsedSeconds * 1_000_000);

          if (onProgress) {
            onProgress({
              test: 'upload',
              value: Math.min(mbps, maxSpeed),
              unit: 'Mbps',
            });
          }
          lastUpdateTime = now;
        }

        animationFrameId = requestAnimationFrame(sendChunk);
      };

      ws.onopen = () => {
        console.log('Upload test connected');
        startTime = performance.now();
        lastUpdateTime = startTime;
        sendChunk();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'start') {
            chunkSize = message.chunkSize || chunkSize;
          } else if (message.type === 'chunkSize') {
            // Server adjusted chunk size
            chunkSize = message.chunkSize;
          } else if (message.type === 'result') {
            if (animationFrameId !== null) {
              cancelAnimationFrame(animationFrameId);
            }
            const uploadResult: UploadResult = {
              throughput: message.throughput,
              bytes: message.bytes,
              duration: message.duration,
              speedVariance: message.speedVariance,
              speedSamples: message.speedSamples,
            };
            resolve(uploadResult);
            ws.close();
          }
        } catch (error) {
          console.error('Error parsing upload message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Upload test WebSocket error:', error);
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        reject(new Error('Failed to connect to upload test server'));
        ws.close();
      };

      ws.onclose = (event) => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        if (event.code !== 1000 && event.code !== 1001) {
          reject(new Error(`Connection closed unexpectedly: ${event.code}`));
        }
      };
    });
  }

  /**
   * Run all three tests in sequence
   */
  async runFullTest(
    onProgress?: ProgressCallback
  ): Promise<{
    ping: PingResult;
    download: DownloadResult;
    upload: UploadResult;
  }> {
    // Run ping test
    const ping = await this.runPingTest(onProgress);

    // Run download test
    const download = await this.runDownloadTest(onProgress);

    // Run upload test
    const upload = await this.runUploadTest(onProgress);

    return { ping, download, upload };
  }
}


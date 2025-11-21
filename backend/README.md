# Nova Speed Test Backend

A high-performance, production-grade Internet Speed Test backend built with Go (Golang). This backend provides accurate, fast, and reliable speed testing capabilities that outperform existing tools like Ookla Speedtest, Cloudflare Speed Test, and Netflix Fast.com.

## Features

- **High Performance**: Built with Fiber framework for maximum throughput
- **Real-time Testing**: WebSocket-based endpoints for live test execution
- **Three Core Tests**:
  - Ping/Latency + Jitter measurement
  - Download throughput (multi-connection)
  - Upload throughput (multi-connection)
- **Advanced Optimizations**:
  - Parallel streams for download/upload to maximize bandwidth accuracy
  - Adaptive payload scaling based on link speed
  - Randomized payloads to prevent browser caching
  - Monotonic clock usage for precise timing
  - Auto-scaling for very high-speed networks (1-10 Gbps)
- **Production Ready**:
  - Comprehensive logging with structured logging (zap)
  - CPU usage and traffic monitoring
  - Connection limits and rate limiting
  - CORS and security headers
  - Docker support
  - Health check endpoints

## Architecture

The backend follows clean architecture principles:

```
backend/
├── main.go                 # Application entry point
├── internal/
│   ├── config/            # Configuration management
│   ├── handlers/          # HTTP/WebSocket handlers
│   ├── services/          # Business logic (ping, download, upload)
│   ├── models/            # Data models
│   ├── utils/             # Utility functions (rate calculation, payload generation)
│   ├── middleware/        # HTTP middleware (CORS, security, logging)
│   └── logger/            # Logging configuration
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Installation

### Prerequisites

- Go 1.21 or higher
- Docker and Docker Compose (optional, for containerized deployment)

### Local Development

1. **Clone the repository** (if not already done):
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   go mod download
   ```

3. **Run the server**:
   ```bash
   go run main.go
   ```

   The server will start on port `3001` by default (to avoid conflicts with web servers on 8080).

### Docker Deployment

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

2. **Or build manually**:
   ```bash
   docker build -t nova-speed-backend .
   docker run -p 3001:3001 -v $(pwd)/geoip:/usr/share/GeoIP:ro nova-speed-backend
   ```

## Configuration

Configuration is managed through environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `ALLOWED_ORIGINS` | See config | Comma-separated list of allowed CORS origins |
| `MAX_CONNECTIONS` | `1000` | Maximum concurrent connections |
| `ENABLE_LOGGING` | `true` | Enable request/response logging |
| `ENABLE_METRICS` | `true` | Enable CPU and traffic metrics |
| `GEOIP_CITY_PATH` | `/usr/share/GeoIP/GeoLite2-City.mmdb` | Path to GeoLite2-City database |
| `GEOIP_ASN_PATH` | `/usr/share/GeoIP/GeoLite2-ASN.mmdb` | Path to GeoLite2-ASN database (optional) |
| `GEOIP_ISP_PATH` | `/usr/share/GeoIP/GeoLite2-ISP.mmdb` | Path to GeoLite2-ISP database (optional) |
| `ENV` | `production` | Environment (development/production) |

## API Endpoints

### Health Check

```http
GET /health
```

Returns server status.

**Response:**
```json
{
  "status": "ok",
  "service": "nova-speed-backend"
}
```

### IP Information

```http
GET /info
```

Returns client IP address and geolocation information (if GeoIP database is available).

**Response:**
```json
{
  "ip": "192.168.1.1",
  "country": "United States",
  "countryCode": "US",
  "city": "New York",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "asn": 15169,
  "isp": "Google LLC",
  "timezone": "America/New_York",
  "accuracy": "City level (high accuracy)"
}
```

**IP Detection:**
The endpoint automatically detects the real client IP by checking:
1. `X-Real-IP` header (common with reverse proxies)
2. `X-Forwarded-For` header (load balancers)
3. `CF-Connecting-IP` header (Cloudflare)
4. Remote IP (fallback)

**Caching:**
IP lookups are cached for 24 hours to improve performance and reduce database load.

### WebSocket Endpoints

All speed tests use WebSocket connections for real-time communication.

#### 1. Ping/Latency Test

**Endpoint:** `ws://localhost:3001/ws/ping`

Measures latency and jitter by sending ping packets and measuring round-trip time.

**Client Implementation:**

```javascript
const ws = new WebSocket('ws://localhost:8080/ws/ping');

ws.onopen = () => {
  console.log('Connected to ping test');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'ping') {
    // Echo back as pong
    const pong = {
      type: 'pong',
      timestamp: message.timestamp,
      sequence: message.sequence
    };
    ws.send(JSON.stringify(pong));
  } else if (message.type === 'result') {
    console.log('Ping Test Results:');
    console.log(`Latency: ${message.latency.toFixed(2)} ms`);
    console.log(`Jitter: ${message.jitter.toFixed(2)} ms`);
    console.log(`Packets: ${message.packets}`);
    ws.close();
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

#### 2. Download Test

**Endpoint:** `ws://localhost:3001/ws/download`

Measures download throughput by streaming randomized binary data.

**Client Implementation:**

```javascript
const ws = new WebSocket('ws://localhost:8080/ws/download');
let bytesReceived = 0;
let startTime = null;
let chunks = 0;

ws.onopen = () => {
  console.log('Connected to download test');
  startTime = performance.now();
  
  // Send start message with initial chunk size (optional)
  ws.send(JSON.stringify({
    type: 'start',
    chunkSize: 256 * 1024 // 256 KB
  }));
};

ws.onmessage = (event) => {
  if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
    // Binary data received
    const size = event.data.size || event.data.byteLength;
    bytesReceived += size;
    chunks++;
    
    // Calculate and display current speed
    const elapsed = (performance.now() - startTime) / 1000; // seconds
    const mbps = (bytesReceived * 8) / (elapsed * 1_000_000);
    console.log(`Current speed: ${mbps.toFixed(2)} Mbps`);
  } else {
    // JSON result message
    const result = JSON.parse(event.data);
    if (result.type === 'result') {
      console.log('Download Test Results:');
      console.log(`Throughput: ${result.throughput.toFixed(2)} Mbps`);
      console.log(`Bytes: ${result.bytes}`);
      console.log(`Duration: ${result.duration.toFixed(2)}s`);
      ws.close();
    }
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

#### 3. Upload Test

**Endpoint:** `ws://localhost:3001/ws/upload`

Measures upload throughput by receiving binary data from the client.

**Client Implementation:**

```javascript
const ws = new WebSocket('ws://localhost:8080/ws/upload');
let bytesSent = 0;
let startTime = null;
let chunkSize = 256 * 1024; // 256 KB initial
const testDuration = 10000; // 10 seconds

ws.onopen = () => {
  console.log('Connected to upload test');
  startTime = performance.now();
  
  // Start sending data
  sendChunk();
};

function sendChunk() {
  if (performance.now() - startTime >= testDuration) {
    // Send complete message
    ws.send(JSON.stringify({ type: 'complete' }));
    return;
  }
  
  // Generate random binary data
  const buffer = new Uint8Array(chunkSize);
  crypto.getRandomValues(buffer);
  
  // Send binary data
  ws.send(buffer);
  bytesSent += chunkSize;
  
  // Continue sending
  requestAnimationFrame(sendChunk);
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'start') {
    chunkSize = message.chunkSize || chunkSize;
  } else if (message.type === 'chunkSize') {
    // Server adjusted chunk size
    chunkSize = message.chunkSize;
  } else if (message.type === 'result') {
    console.log('Upload Test Results:');
    console.log(`Throughput: ${message.throughput.toFixed(2)} Mbps`);
    console.log(`Bytes: ${message.bytes}`);
    console.log(`Duration: ${message.duration.toFixed(2)}s`);
    ws.close();
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

## Complete Client Integration Example

Here's a complete React/TypeScript example for integrating with the backend:

```typescript
class SpeedTestClient {
  private pingWs: WebSocket | null = null;
  private downloadWs: WebSocket | null = null;
  private uploadWs: WebSocket | null = null;

  async runPingTest(): Promise<{ latency: number; jitter: number }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:8080/ws/ping');
      
      ws.onopen = () => {
        console.log('Ping test started');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'ping') {
          // Echo back immediately
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: message.timestamp,
            sequence: message.sequence
          }));
        } else if (message.type === 'result') {
          resolve({
            latency: message.latency,
            jitter: message.jitter
          });
          ws.close();
        }
      };

      ws.onerror = (error) => {
        reject(error);
        ws.close();
      };
    });
  }

  async runDownloadTest(
    onProgress?: (mbps: number) => void
  ): Promise<{ throughput: number; bytes: number }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:8080/ws/download');
      let bytesReceived = 0;
      let startTime = performance.now();

      ws.onopen = () => {
        startTime = performance.now();
        ws.send(JSON.stringify({ type: 'start', chunkSize: 256 * 1024 }));
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          bytesReceived += event.data.size;
          
          const elapsed = (performance.now() - startTime) / 1000;
          const mbps = (bytesReceived * 8) / (elapsed * 1_000_000);
          
          if (onProgress) {
            onProgress(mbps);
          }
        } else {
          const result = JSON.parse(event.data);
          if (result.type === 'result') {
            resolve({
              throughput: result.throughput,
              bytes: result.bytes
            });
            ws.close();
          }
        }
      };

      ws.onerror = (error) => {
        reject(error);
        ws.close();
      };
    });
  }

  async runUploadTest(
    onProgress?: (mbps: number) => void
  ): Promise<{ throughput: number; bytes: number }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:8080/ws/upload');
      let bytesSent = 0;
      let startTime = performance.now();
      let chunkSize = 256 * 1024;
      const testDuration = 10000; // 10 seconds
      let animationFrameId: number;

      const sendChunk = () => {
        if (performance.now() - startTime >= testDuration) {
          ws.send(JSON.stringify({ type: 'complete' }));
          cancelAnimationFrame(animationFrameId);
          return;
        }

        const buffer = new Uint8Array(chunkSize);
        crypto.getRandomValues(buffer);
        ws.send(buffer);
        bytesSent += chunkSize;

        const elapsed = (performance.now() - startTime) / 1000;
        const mbps = (bytesSent * 8) / (elapsed * 1_000_000);
        if (onProgress) {
          onProgress(mbps);
        }

        animationFrameId = requestAnimationFrame(sendChunk);
      };

      ws.onopen = () => {
        startTime = performance.now();
        sendChunk();
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'chunkSize') {
          chunkSize = message.chunkSize;
        } else if (message.type === 'result') {
          cancelAnimationFrame(animationFrameId);
          resolve({
            throughput: message.throughput,
            bytes: message.bytes
          });
          ws.close();
        }
      };

      ws.onerror = (error) => {
        cancelAnimationFrame(animationFrameId);
        reject(error);
        ws.close();
      };
    });
  }

  async runFullTest(
    onProgress?: (test: string, mbps: number) => void
  ): Promise<{
    ping: { latency: number; jitter: number };
    download: { throughput: number; bytes: number };
    upload: { throughput: number; bytes: number };
  }> {
    // Run ping test
    const ping = await this.runPingTest();
    if (onProgress) onProgress('ping', ping.latency);

    // Run download test
    const download = await this.runDownloadTest((mbps) => {
      if (onProgress) onProgress('download', mbps);
    });

    // Run upload test
    const upload = await this.runUploadTest((mbps) => {
      if (onProgress) onProgress('upload', mbps);
    });

    return { ping, download, upload };
  }
}

// Usage
const client = new SpeedTestClient();
client.runFullTest((test, value) => {
  console.log(`${test}: ${value.toFixed(2)} ${test === 'ping' ? 'ms' : 'Mbps'}`);
}).then(results => {
  console.log('Full test results:', results);
});
```

## Performance Optimizations

### Adaptive Payload Scaling

The backend automatically adjusts chunk sizes based on measured throughput:
- **Low speed (< 100 Mbps)**: 64 KB chunks, 1 stream
- **Medium speed (100-500 Mbps)**: 256 KB - 1 MB chunks, 2 streams
- **High speed (500-1000 Mbps)**: 1-5 MB chunks, 4 streams
- **Very high speed (1+ Gbps)**: 5-10 MB chunks, 8 streams

### Randomized Payloads

All download payloads are randomly generated to prevent browser caching, ensuring accurate measurements.

### Monotonic Clocks

The backend uses monotonic clocks for precise timing measurements, avoiding clock skew issues.

## Monitoring and Logging

The backend provides comprehensive logging:

- **Request Logging**: All HTTP requests are logged with method, path, status, and IP
- **Test Logging**: Each speed test logs start, completion, and results
- **CPU Metrics**: Optional CPU usage logging (enabled with `ENABLE_METRICS=true`)
- **Traffic Metrics**: Optional traffic statistics logging

Logs are structured JSON format (production) or human-readable (development).

## Security

- **CORS**: Configurable CORS policies
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS
- **Connection Limits**: Prevents resource exhaustion
- **Input Validation**: All WebSocket messages are validated

## Development

### Running Tests

```bash
go test ./...
```

### Building

```bash
go build -o nova-speed-backend ./main.go
```

### Code Structure

- **Handlers**: WebSocket connection management and routing
- **Services**: Core test logic (ping, download, upload)
- **Utils**: Helper functions for calculations and payload generation
- **Models**: Data structures for messages and results
- **Middleware**: Cross-cutting concerns (logging, security, limits)

## Troubleshooting

### Connection Issues

- Check that the server is running on the correct port
- Verify CORS settings if connecting from a browser
- Check firewall rules

### Performance Issues

- Increase `MAX_CONNECTIONS` if needed
- Monitor CPU usage with `ENABLE_METRICS=true`
- Check network bandwidth and latency

### WebSocket Errors

- Ensure WebSocket upgrade is supported
- Check browser console for connection errors
- Verify the WebSocket URL is correct (ws:// or wss://)

## License

This project is part of the Nova Speed Test application.

## Contributing

Contributions are welcome! Please ensure:
- Code follows Go best practices
- Tests are included for new features
- Documentation is updated
- Code is properly formatted with `go fmt`


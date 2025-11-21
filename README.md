# SpeedFlux - Internet Speed Test

A production-grade Internet Speed Test application with a beautiful, modern UI and a high-performance Go backend.

## Project Overview

SpeedFlux provides accurate, real-time internet speed testing with three core measurements:
- **Ping/Latency + Jitter**: Measures network latency and connection stability
- **Download Speed**: Tests download throughput with multi-connection streaming
- **Upload Speed**: Tests upload throughput with adaptive chunk sizing

## Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- shadcn-ui components
- WebSocket for real-time communication

**Backend:**
- Go (Golang) 1.21+
- Fiber web framework
- WebSocket for real-time testing
- Docker for containerization

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Go 1.21+ (for backend development)
- Docker and Docker Compose (optional, for containerized deployment)

### Frontend Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend will be available at `http://localhost:3000`

### Backend Development

```bash
# Navigate to backend directory
cd backend

# Install dependencies
go mod download

# Run the server
go run main.go

# Or use Makefile
make run
```

The backend will be available at `http://localhost:3001`

### Docker Deployment

**Backend:**
```bash
cd backend
docker-compose up -d
```

**Frontend:**
```bash
# Build the frontend
npm run build

# Serve with any static file server
# Or use Docker with nginx
```

## Configuration

### Frontend Environment Variables

Create a `.env` file in the root directory:

```env
# WebSocket URL (optional - defaults to same host as frontend)
VITE_WS_URL=wss://speedflux.hashmatrix.dev
```

### Backend Environment Variables

The backend can be configured via environment variables:

```env
PORT=8080
ALLOWED_ORIGINS=https://speedflux.hashmatrix.dev,https://www.speedflux.hashmatrix.dev
MAX_CONNECTIONS=1000
ENABLE_LOGGING=true
ENABLE_METRICS=true
ENV=production
```

## Project Structure

```
nova-speed/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── lib/               # Utilities and services
│   │   └── speedtest-client.ts  # WebSocket client
│   ├── pages/             # Page components
│   └── main.tsx           # Entry point
├── backend/               # Go backend
│   ├── internal/          # Internal packages
│   │   ├── handlers/     # WebSocket handlers
│   │   ├── services/      # Test logic
│   │   ├── models/        # Data models
│   │   └── utils/         # Utilities
│   └── main.go            # Entry point
├── public/                # Static assets
└── package.json           # Frontend dependencies
```

## Features

### Real-time Testing
- WebSocket-based communication for instant updates
- Smooth UI animations during tests
- Real-time speed meter updates

### Performance Optimizations
- Adaptive payload scaling based on network speed
- Parallel streams for accurate bandwidth measurement
- Randomized payloads to prevent caching
- Monotonic clock usage for precise timing

### Production Ready
- Comprehensive error handling
- Connection limits and rate limiting
- CORS and security headers
- Structured logging
- Health check endpoints

## API Endpoints

### WebSocket Endpoints

- `ws://host:8080/ws/ping` - Ping/latency test
- `ws://host:8080/ws/download` - Download throughput test
- `ws://host:8080/ws/upload` - Upload throughput test

### HTTP Endpoints

- `GET /health` - Health check

See [backend README](./backend/README.md) for detailed API documentation.

## Deployment

### Production Deployment

1. **Build Frontend:**
   ```bash
   npm run build
   ```

2. **Deploy Backend:**
   ```bash
   cd backend
   docker-compose up -d
   ```

3. **Configure Environment:**
   - Set `ALLOWED_ORIGINS` to your frontend domain
   - Configure `VITE_WS_URL` in frontend `.env` for production

### Domain Configuration

The application is configured for:
- **Production Domain**: https://speedflux.hashmatrix.dev

Update CORS settings in backend configuration to match your deployment domain.

## Development

### Running Tests

**Frontend:**
```bash
npm run lint
```

**Backend:**
```bash
cd backend
make test
```

### Code Structure

- Frontend follows React best practices with TypeScript
- Backend follows clean architecture principles
- Both use modern tooling and best practices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the SpeedFlux application.

## Support

For issues and questions, please open an issue on the repository.

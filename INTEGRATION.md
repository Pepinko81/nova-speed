# Frontend-Backend Integration Guide

This document describes how the frontend and backend are integrated in the SpeedFlux application.

## Architecture Overview

The application consists of:
- **Frontend**: React + TypeScript application running on port 3000 (dev) or static build
- **Backend**: Go WebSocket server running on port 8080

## WebSocket Communication

### Connection Flow

1. **Frontend** creates a `SpeedTestClient` instance
2. **Client** automatically determines WebSocket URL:
   - Production: `wss://hashmatrix.dev/ws/*`
   - Development: `ws://localhost:8080/ws/*`
3. **Backend** accepts WebSocket connections and runs tests

### Test Flow

#### Ping Test
1. Frontend connects to `/ws/ping`
2. Backend sends ping messages with timestamps
3. Frontend echoes back as pong
4. Backend calculates latency and jitter
5. Backend sends result JSON

#### Download Test
1. Frontend connects to `/ws/download`
2. Frontend sends start message with chunk size
3. Backend streams randomized binary data
4. Frontend receives chunks and calculates real-time speed
5. Backend sends final result JSON

#### Upload Test
1. Frontend connects to `/ws/upload`
2. Backend sends start message
3. Frontend generates and sends random binary data
4. Backend receives data and calculates throughput
5. Backend may adjust chunk size adaptively
6. Backend sends final result JSON

## Configuration

### Frontend Environment Variables

```env
# Optional: Override WebSocket URL
VITE_WS_URL=wss://hashmatrix.dev
```

### Backend Environment Variables

```env
PORT=8080
ALLOWED_ORIGINS=https://hashmatrix.dev,https://www.hashmatrix.dev,http://localhost:3000
MAX_CONNECTIONS=1000
ENABLE_LOGGING=true
ENABLE_METRICS=true
```

## Development Setup

### Local Development

1. **Start Backend:**
   ```bash
   cd backend
   go run main.go
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Test Connection:**
   - Frontend will auto-detect `ws://localhost:8080`
   - Open browser console to see WebSocket connections

### Production Deployment

1. **Backend:**
   - Deploy to server with port 8080 exposed
   - Set `ALLOWED_ORIGINS` to production domain
   - Use `wss://` for secure WebSocket connections

2. **Frontend:**
   - Build: `npm run build`
   - Deploy static files to CDN/hosting
   - Set `VITE_WS_URL` to production WebSocket URL

## Error Handling

The frontend includes comprehensive error handling:
- Connection failures are caught and displayed
- WebSocket errors are logged to console
- User-friendly error messages are shown
- Tests can be retried after errors

## Performance Considerations

- **Adaptive Chunk Sizing**: Backend adjusts chunk sizes based on network speed
- **Parallel Streams**: Download test uses multiple parallel streams for accuracy
- **Real-time Updates**: Frontend updates UI every 100ms during tests
- **Connection Limits**: Backend limits concurrent connections to prevent overload

## Testing

### Manual Testing

1. Start both frontend and backend
2. Open browser to frontend URL
3. Click "Start Test"
4. Observe real-time updates
5. Verify results are displayed correctly

### Debugging

- **Frontend**: Check browser console for WebSocket messages
- **Backend**: Check server logs for connection and test information
- **Network**: Use browser DevTools Network tab to inspect WebSocket frames

## Troubleshooting

### Connection Issues

- **CORS Errors**: Check `ALLOWED_ORIGINS` in backend config
- **WebSocket Fails**: Verify backend is running and port is accessible
- **SSL Issues**: Ensure `wss://` is used for HTTPS sites

### Performance Issues

- **Slow Tests**: Check network connection and server resources
- **High Latency**: Verify server location and network path
- **Connection Drops**: Check connection limits and server logs

## Security

- CORS is configured to only allow specified origins
- WebSocket connections use same-origin or configured domains
- Security headers are set on all HTTP responses
- Connection limits prevent resource exhaustion


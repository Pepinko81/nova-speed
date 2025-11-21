# SpeedFlux Deployment Guide

This guide explains how to deploy the SpeedFlux application using the automated deployment script.

## Quick Start

Run the deployment script:

```bash
./deploy.sh
```

The script will:
1. Check prerequisites (Go, npm)
2. Check and free ports if needed
3. Build backend and frontend
4. Optionally start development servers

## Port Configuration

Default ports:
- **Backend**: `3001` (changed from 8080 to avoid conflicts)
- **Frontend Dev**: `3000`
- **Frontend Production**: Configurable

You can override ports using environment variables:

```bash
BACKEND_PORT=3001 FRONTEND_PORT=3000 ./deploy.sh
```

## Deployment Modes

### 1. Development Mode

Starts both backend and frontend development servers:

```bash
./deploy.sh
# Choose option 1
```

This will:
- Build backend binary to `./bin/nova-speed-backend`
- Build frontend to `./dist/`
- Start backend on port 3001
- Start frontend dev server on port 3000

### 2. Production Mode

Only builds the application without starting servers:

```bash
./deploy.sh
# Choose option 2
```

This will:
- Build backend binary to `./bin/nova-speed-backend`
- Build frontend to `./dist/`

## Manual Deployment

### Backend

```bash
cd backend
go mod download
go build -o ../bin/nova-speed-backend ./main.go

# Run
PORT=3001 ./bin/nova-speed-backend
```

### Frontend

```bash
npm install
npm run build

# Serve (using serve)
npx serve -s dist -l 3000

# Or use any static file server (nginx, Apache, etc.)
```

## Docker Deployment

### Backend Only

```bash
cd backend
docker-compose up -d
```

The backend will run on port 3001.

### Full Stack with Docker

Create a `docker-compose.yml` in the root:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: speedflux-backend
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - ALLOWED_ORIGINS=http://localhost:3000,https://speedflux.hashmatrix.dev
    restart: unless-stopped

  frontend:
    image: nginx:alpine
    container_name: speedflux-frontend
    ports:
      - "3000:80"
    volumes:
      - ./dist:/usr/share/nginx/html
    depends_on:
      - backend
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

## Production Deployment

### 1. Build

```bash
./deploy.sh
# Choose option 2 (Production)
```

### 2. Configure Environment

Create `.env` file:

```env
VITE_WS_URL=wss://speedflux.hashmatrix.dev
```

### 3. Deploy Backend

```bash
# Copy binary to server
scp bin/nova-speed-backend user@server:/opt/speedflux/

# On server, create systemd service
sudo nano /etc/systemd/system/speedflux-backend.service
```

Service file:

```ini
[Unit]
Description=SpeedFlux Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/speedflux
ExecStart=/opt/speedflux/nova-speed-backend
Environment="PORT=3001"
Environment="ALLOWED_ORIGINS=https://speedflux.hashmatrix.dev"
Restart=always

[Install]
WantedBy=multi-user.target
```

Start service:

```bash
sudo systemctl enable speedflux-backend
sudo systemctl start speedflux-backend
```

### 4. Deploy Frontend

```bash
# Copy dist folder to web server
scp -r dist/* user@server:/var/www/speedflux/

# Configure nginx
sudo nano /etc/nginx/sites-available/speedflux
```

Nginx config:

```nginx
server {
    listen 80;
    server_name speedflux.hashmatrix.dev;

    root /var/www/speedflux;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/speedflux /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### Port Already in Use

The script will detect and ask to kill processes. You can also manually:

```bash
# Find process
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Backend Won't Start

Check logs:

```bash
tail -f backend.log
```

Or run directly:

```bash
PORT=3001 ./bin/nova-speed-backend
```

### Frontend Can't Connect to Backend

1. Check backend is running: `curl http://localhost:3001/health`
2. Check CORS settings in backend config
3. Verify WebSocket URL in frontend `.env`

### Build Failures

**Backend:**
```bash
cd backend
go mod tidy
go build ./main.go
```

**Frontend:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Environment Variables

### Backend

- `PORT`: Server port (default: 3001)
- `ALLOWED_ORIGINS`: Comma-separated CORS origins
- `MAX_CONNECTIONS`: Max concurrent connections (default: 1000)
- `ENABLE_LOGGING`: Enable request logging (default: true)
- `ENABLE_METRICS`: Enable CPU/metrics logging (default: true)

### Frontend

- `VITE_WS_URL`: WebSocket URL (auto-detected if not set)
- `VITE_WS_PORT`: Backend port for WebSocket (default: 3001)

## Monitoring

### Check Backend Status

```bash
curl http://localhost:3001/health
```

### View Logs

```bash
# Backend (if using systemd)
sudo journalctl -u speedflux-backend -f

# Backend (if running manually)
tail -f backend.log

# Frontend
tail -f frontend.log
```

## Updates

To update the application:

1. Pull latest changes: `git pull`
2. Rebuild: `./deploy.sh`
3. Restart services:
   - Backend: `sudo systemctl restart speedflux-backend`
   - Frontend: Reload web server

## Security Notes

- Always use HTTPS in production
- Set proper `ALLOWED_ORIGINS` in backend
- Use environment variables for sensitive config
- Keep dependencies updated
- Use firewall rules to restrict backend port access


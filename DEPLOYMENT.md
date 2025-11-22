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

Service file (`/etc/systemd/system/speedflux-backend.service`):

```ini
[Unit]
Description=SpeedFlux Backend Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/speedflux
ExecStart=/opt/speedflux/nova-speed-backend
Restart=always
RestartSec=5

# Environment variables
Environment="PORT=3001"
Environment="ALLOWED_ORIGINS=https://speedflux.hashmatrix.dev,https://www.speedflux.hashmatrix.dev"
Environment="MAX_CONNECTIONS=1000"
Environment="ENABLE_LOGGING=true"
Environment="ENABLE_METRICS=true"

# GeoIP database paths (optional)
Environment="GEOIP_CITY_PATH=/usr/share/GeoIP/GeoLite2-City.mmdb"
Environment="GEOIP_ASN_PATH=/usr/share/GeoIP/GeoLite2-ASN.mmdb"

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=speedflux-backend

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
# Create web directory
sudo mkdir -p /var/www/speedflux

# Copy dist folder to web server
scp -r dist/* user@server:/var/www/speedflux/

# Set permissions
sudo chown -R www-data:www-data /var/www/speedflux
sudo chmod -R 755 /var/www/speedflux
```

### 5. Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx-speedflux.conf /etc/nginx/sites-available/speedflux

# Or create manually
sudo nano /etc/nginx/sites-available/speedflux
```

Full nginx configuration is provided in `nginx-speedflux.conf` file. It includes:
- HTTP to HTTPS redirect
- SSL/TLS configuration
- Frontend static file serving
- Backend API proxy
- WebSocket proxy for speed tests
- Security headers

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/speedflux /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL with Certbot

```bash
# Install certbot if not already installed
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d speedflux.hashmatrix.dev -d www.speedflux.hashmatrix.dev

# Certbot will automatically:
# - Obtain certificate from Let's Encrypt
# - Update nginx configuration with SSL settings
# - Set up automatic renewal

# Test automatic renewal
sudo certbot renew --dry-run
```

The certificate will auto-renew. Certbot creates a systemd timer for renewal.

### 7. Setup GeoIP Databases (Optional but Recommended)

```bash
# On server, create GeoIP directory
sudo mkdir -p /usr/share/GeoIP

# Copy GeoIP databases from local machine
scp backend/geoip_data/*.mmdb user@server:/tmp/
sudo mv /tmp/*.mmdb /usr/share/GeoIP/
sudo chmod 644 /usr/share/GeoIP/*.mmdb

# Or download directly on server
cd /tmp
export MAXMIND_LICENSE_KEY="your_license_key"
wget -O download-geoip.sh https://raw.githubusercontent.com/your-repo/nova-speed/main/backend/scripts/download-geoip.sh
chmod +x download-geoip.sh
./download-geoip.sh
sudo mv geoip_data/*.mmdb /usr/share/GeoIP/
```

Update backend service to use GeoIP:

```bash
sudo systemctl edit speedflux-backend
```

Add:

```ini
[Service]
Environment="GEOIP_CITY_PATH=/usr/share/GeoIP/GeoLite2-City.mmdb"
Environment="GEOIP_ASN_PATH=/usr/share/GeoIP/GeoLite2-ASN.mmdb"
```

Reload service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart speedflux-backend
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

## Production Deployment Checklist

1. ✅ Build application: `./deploy.sh` (choose option 2)
2. ✅ Copy backend binary to server: `/opt/speedflux/nova-speed-backend`
3. ✅ Create systemd service: `/etc/systemd/system/speedflux-backend.service`
4. ✅ Enable and start backend service
5. ✅ Copy frontend build to: `/var/www/speedflux/`
6. ✅ Configure nginx: `/etc/nginx/sites-available/speedflux`
7. ✅ Setup SSL with certbot
8. ✅ (Optional) Setup GeoIP databases
9. ✅ Test all endpoints

## Updates

To update the application:

1. Pull latest changes: `git pull`
2. Rebuild: `./deploy.sh` (choose option 2)
3. Copy new files to server:
   ```bash
   scp bin/nova-speed-backend user@server:/opt/speedflux/
   scp -r dist/* user@server:/var/www/speedflux/
   ```
4. Restart services:
   - Backend: `sudo systemctl restart speedflux-backend`
   - Frontend: `sudo systemctl reload nginx` (or restart if needed)
5. Verify:
   ```bash
   curl https://speedflux.hashmatrix.dev/health
   curl https://speedflux.hashmatrix.dev/info
   ```

## Security Notes

- Always use HTTPS in production
- Set proper `ALLOWED_ORIGINS` in backend
- Use environment variables for sensitive config
- Keep dependencies updated
- Use firewall rules to restrict backend port access


# SpeedFlux Deployment Guide

This guide explains how to deploy the SpeedFlux application using the automated deployment script.

## Quick Start

### Development Deployment

Run the development deployment script:

```bash
./deploy.sh
```

The script will:
1. Check prerequisites (Go, npm)
2. Check and free ports if needed
3. Build backend and frontend
4. Optionally start development servers

### Production Deployment

For production, use the automated production script:

```bash
sudo ./deploy-production.sh
```

This will handle the complete production deployment (see Production Deployment section below).

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
      - ALLOWED_ORIGINS=http://localhost:3000,https://hashmatrix.dev
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

### Option 1: Automated Deployment Script (Recommended)

The automated script handles building, installing, and configuring the backend and frontend:

```bash
# On your server, clone the repository
git clone https://github.com/your-username/nova-speed.git
cd nova-speed

# Run the automated deployment script (requires root/sudo)
sudo ./deploy-production.sh
```

The script will:
1. ✅ Check prerequisites (Go, npm)
2. ✅ Build backend and frontend
3. ✅ Install backend to `/opt/speedflux/`
4. ✅ Create systemd service
5. ✅ Install frontend to `/var/www/speedflux/`
6. ✅ Optionally setup GeoIP databases
7. ✅ Enable and start the backend service

**Note:** The script does NOT configure nginx or SSL. You must do that manually (see Option 2 below).

### Option 2: Manual Deployment

#### 1. Build

```bash
./deploy.sh
# Choose option 2 (Production)
```

Or use the production script:

```bash
sudo ./deploy-production.sh
```

#### 2. Configure Environment

Create `.env` file (for frontend build):

```env
VITE_WS_URL=wss://hashmatrix.dev
```

#### 3. Deploy Backend

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
Environment="ALLOWED_ORIGINS=https://hashmatrix.dev,https://www.hashmatrix.dev"
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

### 4. Configure Nginx (Manual Setup Required)

**Note:** The automated deployment script does NOT configure nginx. You must do this manually.

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
- Backend API proxy (`/api/` → `http://localhost:3001/`)
- WebSocket proxy for speed tests (`/ws/` → `http://localhost:3001/ws/`)
- IP info endpoint (`/info` → `http://localhost:3001/info`)
- Security headers

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/speedflux /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Setup SSL with Certbot (Manual Setup Required)

**Note:** The automated deployment script does NOT setup SSL. You must do this manually.

#### Option A: Automated SSL Setup (Recommended)

Use the provided script for easier SSL setup:

```bash
# Make script executable
chmod +x setup-ssl-simple.sh

# Run the script
sudo ./setup-ssl-simple.sh
```

This script will:
1. Create ACME challenge directory
2. Install HTTP-only nginx configuration
3. Obtain SSL certificate using standalone mode (more reliable)
4. Configure nginx with SSL automatically

#### Option B: Manual SSL Setup

If the automated script doesn't work, follow these manual steps:

**Step 1: Install certbot**
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

**Step 2: Use HTTP-only nginx configuration first**
```bash
# Copy HTTP-only configuration (no SSL yet)
sudo cp nginx-speedflux-http-only.conf /etc/nginx/sites-available/speedflux

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

**Step 3: Obtain certificate using standalone mode (most reliable)**

If nginx ACME challenge returns 204 errors, use standalone mode:

```bash
# Stop nginx temporarily (certbot needs port 80)
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone \
    -d hashmatrix.dev \
    --non-interactive \
    --agree-tos \
    --email admin@hashmatrix.dev \
    --preferred-challenges http

# Start nginx again
sudo systemctl start nginx
```

**Step 4: Configure nginx with SSL**

After certificate is obtained, use certbot to configure nginx:

```bash
sudo certbot --nginx -d hashmatrix.dev --redirect
```

If certbot nginx plugin fails, manually update nginx configuration:

```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/speedflux
```

Add HTTPS server block (see `nginx-speedflux.conf` for full example):

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name hashmatrix.dev www.hashmatrix.dev;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hashmatrix.dev www.hashmatrix.dev;

    ssl_certificate /etc/letsencrypt/live/hashmatrix.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hashmatrix.dev/privkey.pem;
    
    # ... rest of configuration (see nginx-speedflux.conf)
}
```

**Step 5: Test and reload**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Step 6: Test automatic renewal**
```bash
sudo certbot renew --dry-run
```

The certificate will auto-renew. Certbot creates a systemd timer for renewal.

#### Troubleshooting SSL Setup

**Problem: Certbot returns "204 Invalid response" for ACME challenge**

This usually means nginx is not serving the ACME challenge correctly. Solutions:

1. **Use standalone mode** (recommended):
   ```bash
   sudo systemctl stop nginx
   sudo certbot certonly --standalone -d hashmatrix.dev
   sudo systemctl start nginx
   ```

2. **Check ACME challenge directory**:
   ```bash
   sudo mkdir -p /var/www/html/.well-known/acme-challenge
   sudo chown -R www-data:www-data /var/www/html/.well-known
   sudo chmod -R 755 /var/www/html/.well-known
   ```

3. **Verify nginx location block**:
   ```bash
   # Test locally
   echo "test" | sudo tee /var/www/html/.well-known/acme-challenge/test
   curl http://localhost/.well-known/acme-challenge/test
   # Should return "test", not 204 or 404
   ```

**Problem: DNS errors (NXDOMAIN)**

Ensure your domain DNS records point to this server:
```bash
# Check DNS
dig hashmatrix.dev
nslookup hashmatrix.dev
```

**Problem: Certificate obtained but nginx still shows errors**

1. Verify certificate files exist:
   ```bash
   sudo ls -la /etc/letsencrypt/live/hashmatrix.dev/
   ```

2. Check nginx error log:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. Verify nginx configuration:
   ```bash
   sudo nginx -t
   ```

### 6. Setup GeoIP Databases (Optional but Recommended)

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

### Automated Deployment (Recommended)

1. ✅ Clone repository on server
2. ✅ Run: `sudo ./deploy-production.sh`
3. ✅ Configure nginx manually (see section 4)
4. ✅ Setup SSL with certbot manually (see section 5)
5. ✅ (Optional) Setup GeoIP databases
6. ✅ Test all endpoints

### Manual Deployment

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
   curl https://hashmatrix.dev/health
   curl https://hashmatrix.dev/info
   ```

## Security Notes

- Always use HTTPS in production
- Set proper `ALLOWED_ORIGINS` in backend
- Use environment variables for sensitive config
- Keep dependencies updated
- Use firewall rules to restrict backend port access


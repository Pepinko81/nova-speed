#!/bin/bash

# SpeedFlux Production Deployment Script
# This script automates the deployment of SpeedFlux backend and frontend
# Note: Nginx and SSL setup must be done manually

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=${BACKEND_PORT:-3001}
BACKEND_DIR="backend"
FRONTEND_DIR="."
BACKEND_BINARY="nova-speed-backend"
SERVICE_NAME="speedflux-backend"
INSTALL_DIR="/opt/speedflux"
WEB_DIR="/var/www/speedflux"
SERVICE_USER="www-data"
SERVICE_GROUP="www-data"
DOMAIN="speedflux.hashmatrix.dev"

echo -e "${GREEN}=== SpeedFlux Production Deployment Script ===${NC}\n"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    local missing=0
    
    if ! command -v go &> /dev/null; then
        echo -e "${RED}✗ Go is not installed${NC}"
        missing=1
    else
        echo -e "${GREEN}✓ Go found${NC}"
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗ npm is not installed${NC}"
        missing=1
    else
        echo -e "${GREEN}✓ npm found${NC}"
    fi
    
    if [ $missing -eq 1 ]; then
        echo -e "${RED}Please install missing prerequisites and run again${NC}"
        exit 1
    fi
    
    echo ""
}

# Function to build backend
build_backend() {
    echo -e "${BLUE}Building backend...${NC}"
    
    cd "$BACKEND_DIR"
    
    echo "Downloading Go dependencies..."
    go mod download
    
    echo "Building Go binary..."
    go build -o "../bin/$BACKEND_BINARY" ./main.go
    
    if [ ! -f "../bin/$BACKEND_BINARY" ]; then
        echo -e "${RED}Error: Backend build failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Backend built successfully${NC}\n"
    cd ..
}

# Function to build frontend
build_frontend() {
    echo -e "${BLUE}Building frontend...${NC}"
    
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo "Installing npm dependencies..."
        npm install
    fi
    
    echo "Building frontend..."
    npm run build
    
    if [ ! -d "dist" ]; then
        echo -e "${RED}Error: Frontend build failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Frontend built successfully${NC}\n"
    cd ..
}

# Function to install backend
install_backend() {
    echo -e "${BLUE}Installing backend...${NC}"
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    
    # Copy binary
    cp "bin/$BACKEND_BINARY" "$INSTALL_DIR/"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$INSTALL_DIR/$BACKEND_BINARY"
    chmod +x "$INSTALL_DIR/$BACKEND_BINARY"
    
    echo -e "${GREEN}✓ Backend installed to $INSTALL_DIR${NC}\n"
}

# Function to create systemd service
create_systemd_service() {
    echo -e "${BLUE}Creating systemd service...${NC}"
    
    local service_file="/etc/systemd/system/$SERVICE_NAME.service"
    
    # Check if service already exists
    if [ -f "$service_file" ]; then
        echo -e "${YELLOW}Service file already exists. Overwrite? (y/n)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Skipping service creation${NC}\n"
            return
        fi
    fi
    
    cat > "$service_file" << EOF
[Unit]
Description=SpeedFlux Backend Service
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/$BACKEND_BINARY
Restart=always
RestartSec=5

# Environment variables
Environment="PORT=$BACKEND_PORT"
Environment="ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN"
Environment="MAX_CONNECTIONS=1000"
Environment="ENABLE_LOGGING=true"
Environment="ENABLE_METRICS=true"

# GeoIP database paths (optional - uncomment if GeoIP databases are installed)
# Environment="GEOIP_CITY_PATH=/usr/share/GeoIP/GeoLite2-City.mmdb"
# Environment="GEOIP_ASN_PATH=/usr/share/GeoIP/GeoLite2-ASN.mmdb"

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF
    
    echo -e "${GREEN}✓ Systemd service created${NC}\n"
}

# Function to install frontend
install_frontend() {
    echo -e "${BLUE}Installing frontend...${NC}"
    
    # Create web directory
    mkdir -p "$WEB_DIR"
    
    # Copy frontend files
    cp -r dist/* "$WEB_DIR/"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$WEB_DIR"
    chmod -R 755 "$WEB_DIR"
    
    echo -e "${GREEN}✓ Frontend installed to $WEB_DIR${NC}\n"
}

# Function to setup GeoIP (optional)
setup_geoip() {
    echo -e "${BLUE}GeoIP Database Setup (Optional)${NC}"
    echo -e "${YELLOW}Do you want to setup GeoIP databases? (y/n)${NC}"
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping GeoIP setup${NC}\n"
        return
    fi
    
    # Check if GeoIP databases exist locally
    if [ -d "$BACKEND_DIR/geoip_data" ] && [ -n "$(ls -A $BACKEND_DIR/geoip_data/*.mmdb 2>/dev/null)" ]; then
        echo "Found GeoIP databases in $BACKEND_DIR/geoip_data/"
        echo -e "${YELLOW}Copy GeoIP databases to /usr/share/GeoIP/? (y/n)${NC}"
        read -r copy_response
        
        if [[ "$copy_response" =~ ^[Yy]$ ]]; then
            mkdir -p /usr/share/GeoIP
            cp "$BACKEND_DIR/geoip_data"/*.mmdb /usr/share/GeoIP/ 2>/dev/null || true
            chmod 644 /usr/share/GeoIP/*.mmdb 2>/dev/null || true
            echo -e "${GREEN}✓ GeoIP databases copied${NC}"
            
            # Update service file to include GeoIP paths
            if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
                sed -i 's|# Environment="GEOIP_CITY_PATH|Environment="GEOIP_CITY_PATH|g' "/etc/systemd/system/$SERVICE_NAME.service"
                sed -i 's|# Environment="GEOIP_ASN_PATH|Environment="GEOIP_ASN_PATH|g' "/etc/systemd/system/$SERVICE_NAME.service"
                echo -e "${GREEN}✓ Service file updated with GeoIP paths${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}No GeoIP databases found locally${NC}"
        echo "You can download them later using:"
        echo "  cd backend"
        echo "  export MAXMIND_LICENSE_KEY=your_key"
        echo "  ./scripts/download-geoip.sh"
    fi
    
    echo ""
}

# Function to enable and start service
start_service() {
    echo -e "${BLUE}Enabling and starting service...${NC}"
    
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo -e "${YELLOW}Service is already running. Restart? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            systemctl restart "$SERVICE_NAME"
        fi
    else
        systemctl start "$SERVICE_NAME"
    fi
    
    sleep 2
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo -e "${GREEN}✓ Service is running${NC}\n"
    else
        echo -e "${RED}✗ Service failed to start. Check logs:${NC}"
        echo "  sudo journalctl -u $SERVICE_NAME -n 50"
        exit 1
    fi
}

# Function to verify installation
verify_installation() {
    echo -e "${BLUE}Verifying installation...${NC}"
    
    # Check backend service
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo -e "${GREEN}✓ Backend service is running${NC}"
    else
        echo -e "${RED}✗ Backend service is not running${NC}"
    fi
    
    # Check backend health
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
        echo -e "${GREEN}✓ Backend health check passed${NC}"
    else
        echo -e "${YELLOW}⚠ Backend health check failed (may need nginx proxy)${NC}"
    fi
    
    # Check frontend files
    if [ -d "$WEB_DIR" ] && [ -f "$WEB_DIR/index.html" ]; then
        echo -e "${GREEN}✓ Frontend files installed${NC}"
    else
        echo -e "${RED}✗ Frontend files not found${NC}"
    fi
    
    echo ""
}

# Main deployment flow
main() {
    check_prerequisites
    build_backend
    build_frontend
    install_backend
    create_systemd_service
    install_frontend
    setup_geoip
    start_service
    verify_installation
    
    echo -e "${GREEN}=== Deployment Complete ===${NC}\n"
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Configure nginx (see DEPLOYMENT.md for nginx configuration)"
    echo "2. Setup SSL with certbot: sudo certbot --nginx -d $DOMAIN"
    echo "3. Test the application:"
    echo "   - Backend: curl http://localhost:$BACKEND_PORT/health"
    echo "   - Frontend: Check $WEB_DIR"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  - View logs: sudo journalctl -u $SERVICE_NAME -f"
    echo "  - Restart service: sudo systemctl restart $SERVICE_NAME"
    echo "  - Check status: sudo systemctl status $SERVICE_NAME"
    echo ""
}

# Run main function
main


#!/bin/bash

# Script to setup SSL certificate for SpeedFlux using standalone mode
# This avoids nginx configuration issues with ACME challenge

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="speedflux.hashmatrix.dev"
NGINX_CONFIG="/etc/nginx/sites-available/speedflux"
NGINX_ENABLED="/etc/nginx/sites-enabled/speedflux"

echo -e "${BLUE}=== SpeedFlux SSL Setup Script ===${NC}"
echo ""

# Step 1: Ensure ACME challenge directory exists
echo -e "${YELLOW}Step 1: Creating ACME challenge directory...${NC}"
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html/.well-known
sudo chmod -R 755 /var/www/html/.well-known
echo -e "${GREEN}✓ ACME challenge directory created${NC}"
echo ""

# Step 2: Update nginx configuration with correct ACME challenge location
echo -e "${YELLOW}Step 2: Updating nginx configuration...${NC}"
if [ -f "$NGINX_CONFIG" ]; then
    # Backup existing config
    sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓ Backup created${NC}"
fi

# Copy the correct configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sudo cp "$SCRIPT_DIR/nginx-speedflux.conf" "$NGINX_CONFIG"
echo -e "${GREEN}✓ Configuration updated${NC}"
echo ""

# Step 3: Test nginx configuration
echo -e "${YELLOW}Step 3: Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    exit 1
fi
echo ""

# Step 4: Reload nginx
echo -e "${YELLOW}Step 4: Reloading nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

# Step 5: Test ACME challenge directory
echo -e "${YELLOW}Step 5: Testing ACME challenge directory...${NC}"
echo "test123" | sudo tee /var/www/html/.well-known/acme-challenge/test > /dev/null
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/.well-known/acme-challenge/test" || echo "000")
sudo rm -f /var/www/html/.well-known/acme-challenge/test

if [ "$TEST_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ ACME challenge directory is accessible${NC}"
elif [ "$TEST_RESPONSE" = "404" ]; then
    echo -e "${YELLOW}⚠ ACME challenge returns 404 (this is OK for non-existent files)${NC}"
else
    echo -e "${RED}✗ ACME challenge directory test failed (HTTP $TEST_RESPONSE)${NC}"
    echo -e "${YELLOW}  This might be OK if DNS is not pointing to this server yet${NC}"
fi
echo ""

# Step 6: Use standalone mode for certbot (more reliable)
echo -e "${YELLOW}Step 6: Obtaining SSL certificate using standalone mode...${NC}"
echo -e "${BLUE}  This will temporarily stop nginx on port 80${NC}"
echo ""

read -p "Continue with certificate installation? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Installation cancelled${NC}"
    exit 0
fi

# Stop nginx temporarily
echo -e "${YELLOW}Stopping nginx temporarily...${NC}"
sudo systemctl stop nginx

# Obtain certificate using standalone mode
echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
if sudo certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email admin@hashmatrix.dev --preferred-challenges http; then
    echo -e "${GREEN}✓ SSL certificate obtained successfully${NC}"
else
    echo -e "${RED}✗ Failed to obtain SSL certificate${NC}"
    echo -e "${YELLOW}Starting nginx again...${NC}"
    sudo systemctl start nginx
    exit 1
fi
echo ""

# Step 7: Update nginx configuration with SSL
echo -e "${YELLOW}Step 7: Updating nginx configuration with SSL...${NC}"
# Uncomment HTTPS server block
sudo sed -i 's/^# server {/server {/' "$NGINX_CONFIG"
sudo sed -i 's/^#     listen 443/    listen 443/' "$NGINX_CONFIG"
sudo sed -i 's/^#     listen \[::\]:443/    listen [::]:443/' "$NGINX_CONFIG"
sudo sed -i 's/^#     server_name/    server_name/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # SSL certificates/    # SSL certificates/' "$NGINX_CONFIG"
sudo sed -i 's/^#     ssl_certificate/    ssl_certificate/' "$NGINX_CONFIG"
sudo sed -i 's/^#     ssl_certificate_key/    ssl_certificate_key/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # SSL configuration/    # SSL configuration/' "$NGINX_CONFIG"
sudo sed -i 's/^#     ssl_protocols/    ssl_protocols/' "$NGINX_CONFIG"
sudo sed -i 's/^#     ssl_ciphers/    ssl_ciphers/' "$NGINX_CONFIG"
sudo sed -i 's/^#     ssl_prefer_server_ciphers/    ssl_prefer_server_ciphers/' "$NGINX_CONFIG"
sudo sed -i 's/^#     ssl_session_cache/    ssl_session_cache/' "$NGINX_CONFIG"
sudo sed -i 's/^#     ssl_session_timeout/    ssl_session_timeout/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # Security headers/    # Security headers/' "$NGINX_CONFIG"
sudo sed -i 's/^#     add_header/    add_header/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # Root directory/    # Root directory/' "$NGINX_CONFIG"
sudo sed -i 's/^#     root/    root/' "$NGINX_CONFIG"
sudo sed -i 's/^#     index/    index/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # Gzip compression/    # Gzip compression/' "$NGINX_CONFIG"
sudo sed -i 's/^#     gzip/    gzip/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # Frontend static files/    # Frontend static files/' "$NGINX_CONFIG"
sudo sed -i 's/^#     location \/ {/    location \/ {/' "$NGINX_CONFIG"
sudo sed -i 's/^#         try_files/        try_files/' "$NGINX_CONFIG"
sudo sed -i 's/^#         # Cache static assets/        # Cache static assets/' "$NGINX_CONFIG"
sudo sed -i 's/^#         location ~\*/        location ~*/' "$NGINX_CONFIG"
sudo sed -i 's/^#             expires/            expires/' "$NGINX_CONFIG"
sudo sed -i 's/^#             add_header/            add_header/' "$NGINX_CONFIG"
sudo sed -i 's/^#         }/        }/' "$NGINX_CONFIG"
sudo sed -i 's/^#     }/    }/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # Backend API proxy/    # Backend API proxy/' "$NGINX_CONFIG"
sudo sed -i 's/^#     location \/api\//    location \/api\//' "$NGINX_CONFIG"
sudo sed -i 's/^#         proxy_pass/        proxy_pass/' "$NGINX_CONFIG"
sudo sed -i 's/^#         proxy_http_version/        proxy_http_version/' "$NGINX_CONFIG"
sudo sed -i 's/^#         # Headers/        # Headers/' "$NGINX_CONFIG"
sudo sed -i 's/^#         proxy_set_header/        proxy_set_header/' "$NGINX_CONFIG"
sudo sed -i 's/^#         # Timeouts/        # Timeouts/' "$NGINX_CONFIG"
sudo sed -i 's/^#         proxy_connect_timeout/        proxy_connect_timeout/' "$NGINX_CONFIG"
sudo sed -i 's/^#         proxy_send_timeout/        proxy_send_timeout/' "$NGINX_CONFIG"
sudo sed -i 's/^#         proxy_read_timeout/        proxy_read_timeout/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # WebSocket proxy/    # WebSocket proxy/' "$NGINX_CONFIG"
sudo sed -i 's/^#     location \/ws\//    location \/ws\//' "$NGINX_CONFIG"
sudo sed -i 's/^#         # WebSocket headers/        # WebSocket headers/' "$NGINX_CONFIG"
sudo sed -i 's/^#         # WebSocket timeouts/        # WebSocket timeouts/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # IP Info endpoint/    # IP Info endpoint/' "$NGINX_CONFIG"
sudo sed -i 's/^#     location \/info/    location \/info/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # Health check endpoint/    # Health check endpoint/' "$NGINX_CONFIG"
sudo sed -i 's/^#     location \/health/    location \/health/' "$NGINX_CONFIG"
sudo sed -i 's/^#     # Deny access/    # Deny access/' "$NGINX_CONFIG"
sudo sed -i 's/^#     location ~ \/\\\./    location ~ \/\\\./' "$NGINX_CONFIG"
sudo sed -i 's/^#         deny/        deny/' "$NGINX_CONFIG"
sudo sed -i 's/^#         access_log/        access_log/' "$NGINX_CONFIG"
sudo sed -i 's/^#         log_not_found/        log_not_found/' "$NGINX_CONFIG"
sudo sed -i 's/^#     }/    }/' "$NGINX_CONFIG"
sudo sed -i 's/^# }/}/' "$NGINX_CONFIG"

# Test configuration
if sudo nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration updated successfully${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    sudo cp "${NGINX_CONFIG}.backup."* "$NGINX_CONFIG" 2>/dev/null || true
    sudo systemctl start nginx
    exit 1
fi
echo ""

# Step 8: Start nginx
echo -e "${YELLOW}Step 8: Starting nginx...${NC}"
sudo systemctl start nginx
echo -e "${GREEN}✓ Nginx started${NC}"
echo ""

# Step 9: Setup auto-renewal
echo -e "${YELLOW}Step 9: Setting up certificate auto-renewal...${NC}"
# Certbot should have already set up a systemd timer, but let's verify
if sudo systemctl list-timers | grep -q certbot; then
    echo -e "${GREEN}✓ Certificate auto-renewal is configured${NC}"
else
    echo -e "${YELLOW}⚠ Auto-renewal might not be configured. Run: sudo certbot renew --dry-run${NC}"
fi
echo ""

echo -e "${GREEN}=== SSL Setup Complete ===${NC}"
echo ""
echo "Your site should now be accessible at:"
echo -e "  ${BLUE}https://$DOMAIN${NC}"
echo ""
echo "To test SSL:"
echo "  curl -I https://$DOMAIN"
echo ""
echo "To view nginx logs:"
echo "  sudo tail -f /var/log/nginx/error.log"
echo "  sudo tail -f /var/log/nginx/access.log"
echo ""


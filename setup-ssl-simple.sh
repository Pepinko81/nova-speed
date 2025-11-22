#!/bin/bash

# Simple SSL setup script for SpeedFlux
# Uses standalone mode to avoid nginx ACME challenge issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="hashmatrix.dev"
NGINX_CONFIG="/etc/nginx/sites-available/speedflux"

echo -e "${BLUE}=== SpeedFlux SSL Setup (Standalone Mode) ===${NC}"
echo ""

# Step 1: Ensure ACME challenge directory exists
echo -e "${YELLOW}[1/5] Creating ACME challenge directory...${NC}"
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html/.well-known
sudo chmod -R 755 /var/www/html/.well-known
echo -e "${GREEN}✓ Done${NC}"
echo ""

# Step 2: Use HTTP-only nginx config (no SSL yet)
echo -e "${YELLOW}[2/5] Installing HTTP-only nginx configuration...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$NGINX_CONFIG" ]; then
    sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
fi
sudo cp "$SCRIPT_DIR/nginx-speedflux-http-only.conf" "$NGINX_CONFIG"

if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx configured (HTTP only)${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    exit 1
fi
echo ""

# Step 3: Test ACME challenge directory
echo -e "${YELLOW}[3/5] Testing ACME challenge directory...${NC}"
echo "test123" | sudo tee /var/www/html/.well-known/acme-challenge/test > /dev/null
sleep 1
if curl -s "http://$DOMAIN/.well-known/acme-challenge/test" | grep -q "test123"; then
    echo -e "${GREEN}✓ ACME challenge directory is accessible${NC}"
else
    echo -e "${YELLOW}⚠ ACME challenge test failed (might be DNS issue)${NC}"
fi
sudo rm -f /var/www/html/.well-known/acme-challenge/test
echo ""

# Step 4: Obtain certificate using standalone mode
echo -e "${YELLOW}[4/5] Obtaining SSL certificate (standalone mode)...${NC}"
echo -e "${BLUE}  This will temporarily stop nginx on port 80${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

sudo systemctl stop nginx

if sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email admin@hashmatrix.dev \
    --preferred-challenges http; then
    echo -e "${GREEN}✓ SSL certificate obtained${NC}"
else
    echo -e "${RED}✗ Failed to obtain certificate${NC}"
    sudo systemctl start nginx
    exit 1
fi
echo ""

# Step 5: Configure nginx with SSL using certbot
echo -e "${YELLOW}[5/5] Configuring nginx with SSL...${NC}"
sudo systemctl start nginx

# Use certbot to configure nginx automatically
if sudo certbot --nginx -d "$DOMAIN" --non-interactive --redirect; then
    echo -e "${GREEN}✓ Nginx configured with SSL${NC}"
else
    echo -e "${YELLOW}⚠ Certbot nginx plugin failed, but certificate is installed${NC}"
    echo -e "${YELLOW}  You may need to manually configure nginx for HTTPS${NC}"
fi
echo ""

echo -e "${GREEN}=== SSL Setup Complete ===${NC}"
echo ""
echo "Test your site:"
echo -e "  ${BLUE}curl -I https://$DOMAIN${NC}"
echo ""
echo "If you see issues, check:"
echo "  sudo nginx -t"
echo "  sudo systemctl status nginx"
echo "  sudo tail -f /var/log/nginx/error.log"
echo ""


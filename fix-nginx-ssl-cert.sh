#!/bin/bash

# Script to fix nginx SSL certificate for hashmatrix.dev

set -e

NGINX_CONFIG="/etc/nginx/sites-available/speedflux"
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Fixing nginx SSL certificate for hashmatrix.dev ===${NC}"
echo ""

# Backup current config
echo -e "${YELLOW}Backing up current configuration...${NC}"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
echo ""

# Check if hashmatrix.dev certificate exists
if [ ! -f "/etc/letsencrypt/live/hashmatrix.dev/fullchain.pem" ]; then
    echo -e "${RED}Error: hashmatrix.dev certificate not found!${NC}"
    echo "Please install the certificate first:"
    echo "  sudo certbot certonly --standalone -d hashmatrix.dev"
    exit 1
fi

# Fix SSL certificate paths in nginx config
echo -e "${YELLOW}Fixing SSL certificate paths...${NC}"

# Replace hashmatrix.de with hashmatrix.dev in SSL certificate paths
sudo sed -i 's|/etc/letsencrypt/live/hashmatrix\.de/|/etc/letsencrypt/live/hashmatrix.dev/|g' "$NGINX_CONFIG"

# Also fix if there are any references in server_name blocks for hashmatrix.dev
# Make sure hashmatrix.dev server block uses the correct certificate

echo -e "${GREEN}✓ SSL certificate paths updated${NC}"
echo ""

# Test nginx configuration
echo -e "${YELLOW}Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    sudo cp "$BACKUP_FILE" "$NGINX_CONFIG"
    exit 1
fi
echo ""

# Show what was changed
echo -e "${BLUE}SSL certificate paths in configuration:${NC}"
sudo grep "ssl_certificate" "$NGINX_CONFIG" | grep hashmatrix || echo "No hashmatrix SSL certificates found"
echo ""

# Reload nginx
echo -e "${YELLOW}Reloading nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

echo -e "${GREEN}=== Fix Complete ===${NC}"
echo ""
echo "Test your site:"
echo -e "  ${BLUE}curl -I https://hashmatrix.dev${NC}"
echo ""
echo "If you still see errors, check:"
echo "  sudo tail -f /var/log/nginx/error.log"


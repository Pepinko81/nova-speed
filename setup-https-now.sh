#!/bin/bash

# Quick script to setup HTTPS for hashmatrix.dev using certbot

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Setting up HTTPS for hashmatrix.dev ===${NC}"
echo ""

# Check if certificate exists
if [ ! -f "/etc/letsencrypt/live/hashmatrix.dev/fullchain.pem" ]; then
    echo -e "${RED}Error: hashmatrix.dev certificate not found!${NC}"
    echo "Please install the certificate first:"
    echo "  sudo certbot certonly --standalone -d hashmatrix.dev"
    exit 1
fi

echo -e "${GREEN}✓ Certificate found${NC}"
echo ""

# Use certbot to configure nginx
echo -e "${YELLOW}Configuring nginx with SSL using certbot...${NC}"
if sudo certbot --nginx -d hashmatrix.dev --redirect --non-interactive; then
    echo -e "${GREEN}✓ Nginx configured with SSL${NC}"
else
    echo -e "${RED}✗ Certbot failed to configure nginx${NC}"
    echo ""
    echo "You may need to manually configure nginx. See nginx-speedflux.conf for HTTPS example."
    exit 1
fi

echo ""

# Test nginx
echo -e "${YELLOW}Testing nginx configuration...${NC}"
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== HTTPS Setup Complete ===${NC}"
echo ""
echo "Test your site:"
echo -e "  ${BLUE}curl -I https://hashmatrix.dev${NC}"


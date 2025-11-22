#!/bin/bash

# SSL setup using DNS-01 challenge (works behind reverse proxy/load balancer)
# This method doesn't require port 80 access

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="speedflux.hashmatrix.dev"
NGINX_CONFIG="/etc/nginx/sites-available/speedflux"

echo -e "${BLUE}=== SpeedFlux SSL Setup (DNS Challenge) ===${NC}"
echo ""
echo -e "${YELLOW}This method works even if you have a reverse proxy/load balancer${NC}"
echo -e "${YELLOW}that blocks or modifies ACME challenge requests.${NC}"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${RED}✗ certbot is not installed${NC}"
    echo "Install it with: sudo apt install certbot"
    exit 1
fi

# Step 1: Obtain certificate using DNS challenge
echo -e "${YELLOW}[1/3] Obtaining SSL certificate using DNS challenge...${NC}"
echo ""
echo -e "${BLUE}Certbot will ask you to add a TXT record to your DNS.${NC}"
echo -e "${BLUE}You'll need to add it to your DNS provider (e.g., Cloudflare, Namecheap, etc.)${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

# Use manual DNS challenge
if sudo certbot certonly --manual \
    --preferred-challenges dns \
    -d "$DOMAIN" \
    --email admin@hashmatrix.dev \
    --agree-tos \
    --non-interactive \
    --manual-public-ip-logging-ok; then
    echo -e "${GREEN}✓ SSL certificate obtained${NC}"
else
    echo -e "${RED}✗ Failed to obtain certificate${NC}"
    echo ""
    echo "Make sure you:"
    echo "  1. Added the TXT record to your DNS"
    echo "  2. Waited for DNS propagation (can take a few minutes)"
    exit 1
fi
echo ""

# Step 2: Configure nginx with SSL
echo -e "${YELLOW}[2/3] Configuring nginx with SSL...${NC}"

# Check if nginx config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${YELLOW}Installing HTTP-only nginx configuration first...${NC}"
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    sudo cp "$SCRIPT_DIR/nginx-speedflux-http-only.conf" "$NGINX_CONFIG"
    
    # Create symlink if it doesn't exist
    if [ ! -L "/etc/nginx/sites-enabled/speedflux" ]; then
        sudo ln -s "$NGINX_CONFIG" /etc/nginx/sites-enabled/speedflux
    fi
fi

# Use certbot to configure nginx
if sudo certbot --nginx -d "$DOMAIN" --non-interactive --redirect; then
    echo -e "${GREEN}✓ Nginx configured with SSL${NC}"
else
    echo -e "${YELLOW}⚠ Certbot nginx plugin failed, but certificate is installed${NC}"
    echo -e "${YELLOW}  You may need to manually configure nginx for HTTPS${NC}"
    echo ""
    echo "See nginx-speedflux.conf for HTTPS configuration example"
fi
echo ""

# Step 3: Test
echo -e "${YELLOW}[3/3] Testing SSL configuration...${NC}"
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}=== SSL Setup Complete ===${NC}"
echo ""
echo "Test your site:"
echo -e "  ${BLUE}curl -I https://$DOMAIN${NC}"
echo ""
echo "Note: DNS-01 challenge certificates don't auto-renew the same way."
echo "You'll need to manually renew or set up a script for DNS updates."
echo ""


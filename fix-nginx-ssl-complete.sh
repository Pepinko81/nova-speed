#!/bin/bash

# Complete fix for nginx SSL configuration for hashmatrix.dev

set -e

NGINX_CONFIG="/etc/nginx/sites-available/speedflux"
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Complete nginx SSL fix for hashmatrix.dev ===${NC}"
echo ""

# Check if hashmatrix.dev certificate exists
if [ ! -f "/etc/letsencrypt/live/hashmatrix.dev/fullchain.pem" ]; then
    echo -e "${RED}Error: hashmatrix.dev certificate not found!${NC}"
    echo "Please install the certificate first:"
    echo "  sudo certbot certonly --standalone -d hashmatrix.dev"
    exit 1
fi

# Backup
echo -e "${YELLOW}Backing up current configuration...${NC}"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# Check if HTTPS server block exists for hashmatrix.dev
if ! sudo grep -q "server_name.*hashmatrix.dev" "$NGINX_CONFIG" || ! sudo grep -A 20 "server_name.*hashmatrix.dev" "$NGINX_CONFIG" | grep -q "listen.*443"; then
    echo -e "${YELLOW}HTTPS server block not found. Adding it...${NC}"
    
    # Read the HTTP server block
    HTTP_BLOCK=$(sudo grep -A 100 "server_name.*hashmatrix.dev" "$NGINX_CONFIG" | grep -B 100 "^}" | head -n -1)
    
    # Create HTTPS server block
    HTTPS_BLOCK=$(cat <<'EOF'
# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hashmatrix.dev www.hashmatrix.dev;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/hashmatrix.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hashmatrix.dev/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

EOF
)
    
    # Get the location blocks from HTTP server
    LOCATION_BLOCKS=$(sudo grep -A 100 "server_name.*hashmatrix.dev" "$NGINX_CONFIG" | grep -A 100 "location" | grep -B 100 "^}" | head -n -1)
    
    # Append location blocks to HTTPS block
    echo "$HTTPS_BLOCK" > /tmp/https_block.txt
    echo "$LOCATION_BLOCKS" >> /tmp/https_block.txt
    echo "}" >> /tmp/https_block.txt
    
    # Insert HTTPS block after HTTP block
    # Find the line number where HTTP server block ends
    HTTP_END_LINE=$(sudo grep -n "^}" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    
    # Insert HTTPS block
    sudo sed -i "${HTTP_END_LINE}r /tmp/https_block.txt" "$NGINX_CONFIG"
    
    # Update HTTP server to redirect to HTTPS
    sudo sed -i '/server_name.*hashmatrix.dev/,/^}/ {
        /location \/ {/,/^    }/ {
            s|try_files.*|return 301 https://$host$request_uri;|
            /try_files/,/^    }/d
        }
    }' "$NGINX_CONFIG"
    
    echo -e "${GREEN}✓ HTTPS server block added${NC}"
else
    echo -e "${YELLOW}HTTPS server block exists. Updating SSL certificate paths...${NC}"
    # Fix SSL certificate paths
    sudo sed -i 's|/etc/letsencrypt/live/hashmatrix\.de/|/etc/letsencrypt/live/hashmatrix.dev/|g' "$NGINX_CONFIG"
    echo -e "${GREEN}✓ SSL certificate paths updated${NC}"
fi

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

# Show SSL certificate paths
echo -e "${BLUE}SSL certificate configuration:${NC}"
sudo grep -A 2 "server_name.*hashmatrix.dev" "$NGINX_CONFIG" | grep -A 2 "listen.*443" | head -10
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


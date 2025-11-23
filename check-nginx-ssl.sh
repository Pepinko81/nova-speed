#!/bin/bash

# Script to check nginx SSL configuration

echo "=== Checking nginx SSL configuration ==="
echo ""

# Check nginx config for SSL certificate paths
echo "1. SSL certificate paths in nginx config:"
sudo nginx -T 2>/dev/null | grep -A 2 "ssl_certificate" | grep -E "(ssl_certificate|server_name)" | head -10
echo ""

# Check if certificate files exist
echo "2. Checking certificate files:"
if [ -f "/etc/letsencrypt/live/hashmatrix.dev/fullchain.pem" ]; then
    echo "✓ hashmatrix.dev certificate exists"
    ls -lh /etc/letsencrypt/live/hashmatrix.dev/*.pem
else
    echo "✗ hashmatrix.dev certificate NOT found"
fi
echo ""

# Check nginx sites
echo "3. Active nginx sites:"
ls -la /etc/nginx/sites-enabled/
echo ""

# Check nginx config test
echo "4. Nginx configuration test:"
sudo nginx -t
echo ""

# Check which certificate nginx is actually using
echo "5. Testing SSL connection:"
echo | openssl s_client -connect hashmatrix.dev:443 -servername hashmatrix.dev 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo "Failed to connect"


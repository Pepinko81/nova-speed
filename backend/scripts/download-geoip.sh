#!/bin/bash

# Script to download MaxMind GeoLite2 databases
# Note: You need a MaxMind account and license key to download the databases
# Sign up at: https://www.maxmind.com/en/geolite2/signup

set -e

GEOIP_DIR="./geoip"
LICENSE_KEY="${MAXMIND_LICENSE_KEY:-}"

if [ -z "$LICENSE_KEY" ]; then
    echo "Error: MAXMIND_LICENSE_KEY environment variable is not set"
    echo ""
    echo "To get a license key:"
    echo "1. Sign up at https://www.maxmind.com/en/geolite2/signup"
    echo "2. Create a license key in your account"
    echo "3. Set it as: export MAXMIND_LICENSE_KEY=your_key_here"
    echo ""
    exit 1
fi

mkdir -p "$GEOIP_DIR"

echo "Downloading GeoLite2 databases..."

# Download City database
echo "Downloading GeoLite2-City..."
curl -L "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${LICENSE_KEY}&suffix=tar.gz" \
    -o /tmp/GeoLite2-City.tar.gz

# Download ASN database
echo "Downloading GeoLite2-ASN..."
curl -L "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-ASN&license_key=${LICENSE_KEY}&suffix=tar.gz" \
    -o /tmp/GeoLite2-ASN.tar.gz

# Extract databases
echo "Extracting databases..."
cd "$GEOIP_DIR"

tar -xzf /tmp/GeoLite2-City.tar.gz --strip-components=1 --wildcards "*.mmdb"
tar -xzf /tmp/GeoLite2-ASN.tar.gz --strip-components=1 --wildcards "*.mmdb"

# Cleanup
rm /tmp/GeoLite2-City.tar.gz /tmp/GeoLite2-ASN.tar.gz

echo "Done! Databases are in $GEOIP_DIR/"
echo ""
echo "Files:"
ls -lh "$GEOIP_DIR"/*.mmdb


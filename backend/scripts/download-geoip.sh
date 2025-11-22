#!/bin/bash

# Script to download MaxMind GeoLite2 databases
# Note: You need a MaxMind account and license key to download the databases
# Sign up at: https://www.maxmind.com/en/geolite2/signup

set -e

GEOIP_DIR="./geoip_data"
LICENSE_KEY="${MAXMIND_LICENSE_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

if [ -z "$LICENSE_KEY" ]; then
    log_error "MAXMIND_LICENSE_KEY environment variable is not set"
    echo ""
    echo "To get a license key:"
    echo "1. Sign up at https://www.maxmind.com/en/geolite2/signup (it's free!)"
    echo "2. Log in and go to: https://www.maxmind.com/en/accounts/current/license-key"
    echo "3. Create a license key"
    echo "4. Set it as: export MAXMIND_LICENSE_KEY=your_actual_key_here"
    echo ""
    exit 1
fi

# Check if license key looks valid (basic check - not "your_key" placeholder)
if [ "$LICENSE_KEY" = "your_key" ] || [ "$LICENSE_KEY" = "YOUR_KEY" ] || [ ${#LICENSE_KEY} -lt 10 ]; then
    log_error "License key appears to be invalid or a placeholder"
    echo "Please set a valid MaxMind license key."
    echo "Get one at: https://www.maxmind.com/en/accounts/current/license-key"
    exit 1
fi

mkdir -p "$GEOIP_DIR"

# Function to download and validate a database
download_database() {
    local db_name=$1
    local edition_id=$2
    local url="https://download.maxmind.com/app/geoip_download?edition_id=${edition_id}&license_key=${LICENSE_KEY}&suffix=tar.gz"
    local temp_file="/tmp/GeoLite2-${db_name}.tar.gz"
    
    log_info "Downloading GeoLite2-${db_name}..."
    
    # Download with error checking
    if ! curl -L -f -s -S "$url" -o "$temp_file"; then
        log_error "Failed to download GeoLite2-${db_name}"
        log_error "This usually means:"
        log_error "  1. Invalid license key"
        log_error "  2. License key not activated"
        log_error "  3. Network error"
        echo ""
        echo "Check your license key at: https://www.maxmind.com/en/accounts/current/license-key"
        rm -f "$temp_file"
        return 1
    fi
    
    # Check if file is actually a gzip file (not HTML error page)
    if ! file "$temp_file" | grep -q "gzip\|compressed"; then
        log_error "Downloaded file is not a valid gzip archive"
        log_error "MaxMind API returned an error. First 200 chars:"
        head -c 200 "$temp_file"
        echo ""
        rm -f "$temp_file"
        return 1
    fi
    
    # Check file size (should be > 1MB for databases)
    local file_size=$(stat -f%z "$temp_file" 2>/dev/null || stat -c%s "$temp_file" 2>/dev/null || echo "0")
    if [ "$file_size" -lt 1048576 ]; then
        log_error "Downloaded file is too small (${file_size} bytes) - likely an error response"
        log_error "Response content:"
        head -c 500 "$temp_file"
        echo ""
        rm -f "$temp_file"
        return 1
    fi
    
    log_info "Extracting GeoLite2-${db_name}..."
    
    # Extract to temp directory first
    local temp_extract="/tmp/geolite2-extract-${db_name}"
    rm -rf "$temp_extract"
    mkdir -p "$temp_extract"
    
    if ! tar -xzf "$temp_file" -C "$temp_extract" --strip-components=1 2>/dev/null; then
        log_error "Failed to extract GeoLite2-${db_name}.tar.gz"
        rm -f "$temp_file"
        rm -rf "$temp_extract"
        return 1
    fi
    
    # Find and copy .mmdb file
    local mmdb_file=$(find "$temp_extract" -name "*.mmdb" -type f | head -1)
    if [ -z "$mmdb_file" ]; then
        log_error "No .mmdb file found in archive"
        rm -f "$temp_file"
        rm -rf "$temp_extract"
        return 1
    fi
    
    # Copy to destination
    cp "$mmdb_file" "$GEOIP_DIR/GeoLite2-${db_name}.mmdb"
    log_success "GeoLite2-${db_name}.mmdb saved to $GEOIP_DIR/"
    
    # Cleanup
    rm -f "$temp_file"
    rm -rf "$temp_extract"
    
    return 0
}

echo ""
log_info "Starting GeoLite2 database download..."
echo ""

# Download City database
if ! download_database "City" "GeoLite2-City"; then
    log_error "Failed to download City database"
    exit 1
fi

# Download ASN database
if ! download_database "ASN" "GeoLite2-ASN"; then
    log_error "Failed to download ASN database"
    exit 1
fi

# Download Country database
if ! download_database "Country" "GeoLite2-Country"; then
    log_error "Failed to download Country database"
    exit 1
fi

echo ""
log_success "All databases downloaded successfully!"
echo ""
echo "Files in $GEOIP_DIR/:"
ls -lh "$GEOIP_DIR"/*.mmdb 2>/dev/null || echo "No .mmdb files found"
echo ""
log_info "To use these databases, set environment variables:"
echo "  export GEOIP_CITY_PATH=$GEOIP_DIR/GeoLite2-City.mmdb"
echo "  export GEOIP_ASN_PATH=$GEOIP_DIR/GeoLite2-ASN.mmdb"
echo ""
log_info "Note: GeoLite2-Country is a lighter alternative to City database"
echo "      Use City for detailed location, Country for basic country-level info"
echo ""
log_info "Or update docker-compose.yml to mount:"
echo "  - ./geoip_data/GeoLite2-City.mmdb:/usr/share/GeoIP/GeoLite2-City.mmdb:ro"
echo "  - ./geoip_data/GeoLite2-ASN.mmdb:/usr/share/GeoIP/GeoLite2-ASN.mmdb:ro"
echo "  - ./geoip_data/GeoLite2-Country.mmdb:/usr/share/GeoIP/GeoLite2-Country.mmdb:ro"


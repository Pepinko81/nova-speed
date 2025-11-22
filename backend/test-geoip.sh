#!/bin/bash

# Test script for GeoIP functionality
# This simulates requests from different IP addresses

echo "=== GeoIP Test Script ==="
echo ""
echo "Testing backend /info endpoint with different IP addresses..."
echo ""

BASE_URL="http://localhost:3001/info"

test_ip() {
    local ip=$1
    local header=$2
    local description=$3
    
    echo "Test: $description"
    echo "IP: $ip"
    if [ "$header" = "X-Real-IP" ]; then
        response=$(curl -s "$BASE_URL" -H "X-Real-IP: $ip")
    else
        response=$(curl -s "$BASE_URL" -H "X-Forwarded-For: $ip")
    fi
    
    echo "$response" | jq '{ip, country, countryCode, city, latitude, longitude, timezone, isp, asn}' 2>/dev/null || echo "$response"
    echo ""
}

# Test with known public IPs
test_ip "8.8.8.8" "X-Forwarded-For" "Google DNS (US)"
test_ip "1.1.1.1" "X-Forwarded-For" "Cloudflare DNS"
test_ip "185.199.108.153" "X-Forwarded-For" "GitHub (US)"
test_ip "151.101.1.140" "X-Forwarded-For" "Reddit (US)"

# Test with X-Real-IP header
echo "=== Testing with X-Real-IP header ==="
test_ip "8.8.8.8" "X-Real-IP" "Google DNS via X-Real-IP"

# Test localhost (should not have geolocation)
echo "=== Testing localhost (should not have geolocation) ==="
curl -s "$BASE_URL" | jq '{ip, country, countryCode, error}' 2>/dev/null || curl -s "$BASE_URL"
echo ""

echo "=== Test Complete ==="
echo ""
echo "To test from your phone:"
echo "1. Find your phone's IP on the same network"
echo "2. Access: http://YOUR_SERVER_IP:3001/info"
echo "3. Or use: curl http://YOUR_SERVER_IP:3001/info"
echo ""
echo "Check backend logs: tail -f /tmp/backend.log | grep 'IP info'"


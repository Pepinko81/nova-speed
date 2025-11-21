# IP Geolocation Setup Guide

This guide explains how to set up IP geolocation for SpeedFlux using MaxMind GeoLite2 databases.

## Overview

SpeedFlux uses MaxMind GeoLite2 databases to provide IP geolocation information. All geolocation is performed locally on the server - no external services are required.

## How IP Detection Works

The backend automatically detects the real client IP address by checking headers in this order:

1. **X-Real-IP** - Used by reverse proxies (nginx, Apache)
2. **X-Forwarded-For** - Used by load balancers (may contain multiple IPs, first one is used)
3. **CF-Connecting-IP** - Used by Cloudflare
4. **Remote IP** - Fallback to direct connection IP

This ensures accurate IP detection even when the server is behind proxies or load balancers.

## Obtaining MaxMind GeoLite2 Databases

### Step 1: Create MaxMind Account

1. Visit: https://www.maxmind.com/en/geolite2/signup
2. Sign up for a free account
3. After registration, go to "Manage License Keys"
4. Create a new license key
5. Copy the license key

### Step 2: Download Databases

**Option A: Using the provided script (recommended)**

```bash
cd backend
export MAXMIND_LICENSE_KEY=your_license_key_here
./scripts/download-geoip.sh
```

This will download and extract:
- `GeoLite2-City.mmdb` - City-level geolocation
- `GeoLite2-ASN.mmdb` - ASN and ISP information

**Option B: Manual download**

1. Visit: https://www.maxmind.com/en/accounts/current/geoip/downloads
2. Download:
   - GeoLite2-City (MaxMind DB, binary format)
   - GeoLite2-ASN (MaxMind DB, binary format) - optional but recommended
3. Extract the `.mmdb` files
4. Place them in `backend/geoip/` directory

### Step 3: Verify Database Files

```bash
ls -lh backend/geoip/*.mmdb
```

You should see:
- `GeoLite2-City.mmdb` (~60-80 MB)
- `GeoLite2-ASN.mmdb` (~5-10 MB) - optional

## Configuration

### Environment Variables

Set the database paths using environment variables:

```bash
# Default paths (if databases are in /usr/share/GeoIP/)
GEOIP_CITY_PATH=/usr/share/GeoIP/GeoLite2-City.mmdb
GEOIP_ASN_PATH=/usr/share/GeoIP/GeoLite2-ASN.mmdb
GEOIP_ISP_PATH=/usr/share/GeoIP/GeoLite2-ISP.mmdb

# Or custom paths
GEOIP_CITY_PATH=./geoip/GeoLite2-City.mmdb
```

### Local Development

1. Place databases in `backend/geoip/` directory
2. Set environment variable:
   ```bash
   export GEOIP_CITY_PATH=./geoip/GeoLite2-City.mmdb
   ```
3. Start the server:
   ```bash
   cd backend
   go run main.go
   ```

### Docker Deployment

1. Place databases in `backend/geoip/` directory:
   ```bash
   backend/
   ├── geoip/
   │   ├── GeoLite2-City.mmdb
   │   └── GeoLite2-ASN.mmdb
   └── docker-compose.yml
   ```

2. The `docker-compose.yml` automatically mounts this directory:
   ```yaml
   volumes:
     - ./geoip:/usr/share/GeoIP:ro
   ```

3. Start with Docker Compose:
   ```bash
   cd backend
   docker-compose up -d
   ```

### Production Deployment

**Option 1: System-wide installation**

```bash
# Copy databases to system directory
sudo mkdir -p /usr/share/GeoIP
sudo cp backend/geoip/*.mmdb /usr/share/GeoIP/
sudo chmod 644 /usr/share/GeoIP/*.mmdb
```

The backend will automatically find them at the default path.

**Option 2: Application directory**

```bash
# Keep databases with application
mkdir -p /opt/speedflux/geoip
cp backend/geoip/*.mmdb /opt/speedflux/geoip/

# Set environment variable
export GEOIP_CITY_PATH=/opt/speedflux/geoip/GeoLite2-City.mmdb
```

## Updating Databases

MaxMind releases database updates regularly. To update:

1. Re-run the download script:
   ```bash
   export MAXMIND_LICENSE_KEY=your_key
   cd backend
   ./scripts/download-geoip.sh
   ```

2. Restart the backend service:
   ```bash
   # If using systemd
   sudo systemctl restart speedflux-backend
   
   # If using Docker
   docker-compose restart backend
   ```

## Caching

IP lookups are automatically cached for 24 hours to:
- Improve performance
- Reduce database load
- Handle repeated requests from the same IP

Cache is stored in memory and automatically cleaned up.

## Testing

Test the `/info` endpoint:

```bash
curl http://localhost:3001/info
```

Expected response:
```json
{
  "ip": "192.168.1.1",
  "country": "United States",
  "countryCode": "US",
  "city": "New York",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "asn": 15169,
  "isp": "Google LLC",
  "timezone": "America/New_York",
  "accuracy": "City level (high accuracy)"
}
```

## Troubleshooting

### "Geolocation database not available"

- Check that database file exists at the configured path
- Verify file permissions (should be readable)
- Check logs for specific error messages

### "Invalid IP address"

- The IP detection might be failing
- Check if you're behind a proxy that's not setting headers correctly
- Verify `X-Real-IP` or `X-Forwarded-For` headers are being set

### Database file not found

- Verify the path in `GEOIP_CITY_PATH` environment variable
- Check file exists: `ls -lh $GEOIP_CITY_PATH`
- For Docker: Verify volume mount is working

### Outdated location data

- Update the database files (they're updated regularly by MaxMind)
- Clear the cache by restarting the service

## License

GeoLite2 databases are provided under the [GeoLite2 End User License Agreement](https://www.maxmind.com/en/geolite2/eula).

## Support

For issues with MaxMind databases or license keys, contact MaxMind support:
- Website: https://www.maxmind.com/en/support
- Documentation: https://dev.maxmind.com/geoip/geoip2/geolite2/


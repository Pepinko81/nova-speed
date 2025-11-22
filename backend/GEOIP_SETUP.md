# GeoIP Database Setup - Quick Guide

## ✅ Installation Complete

All three GeoLite2 databases have been successfully downloaded:

- **GeoLite2-City.mmdb** (61MB) - Detailed city-level geolocation
- **GeoLite2-ASN.mmdb** (11MB) - ASN and ISP information  
- **GeoLite2-Country.mmdb** (9.4MB) - Country-level geolocation (lighter alternative)

## 📍 Database Location

All databases are located in: `backend/geoip_data/`

## 🚀 Using the Databases

### Option 1: Local Development

Set environment variables before starting the backend:

```bash
cd backend
export GEOIP_CITY_PATH=./geoip_data/GeoLite2-City.mmdb
export GEOIP_ASN_PATH=./geoip_data/GeoLite2-ASN.mmdb
go run main.go
```

### Option 2: Docker Compose

The `docker-compose.yml` is already configured to mount the `geoip_data` directory:

```bash
cd backend
docker-compose up -d
```

The databases will be automatically mounted at `/usr/share/GeoIP/` inside the container.

### Option 3: Production Deployment

Copy databases to a system directory:

```bash
sudo mkdir -p /usr/share/GeoIP
sudo cp backend/geoip_data/*.mmdb /usr/share/GeoIP/
sudo chmod 644 /usr/share/GeoIP/*.mmdb
```

The backend will automatically find them at the default path.

## 🔄 Updating Databases

MaxMind releases database updates regularly. To update:

```bash
cd backend
export MAXMIND_LICENSE_KEY="your_license_key_here"
./scripts/download-geoip.sh
```

Then restart your backend service.

## 📝 License Key

Your MaxMind license key is stored in `geo-licenze-key.txt` (not committed to git for security).

To use it:
```bash
export MAXMIND_LICENSE_KEY=$(cat ../geo-licenze-key.txt)
```

## ✅ Verification

Test that geolocation is working:

```bash
# Start backend with databases
cd backend
export GEOIP_CITY_PATH=./geoip_data/GeoLite2-City.mmdb
go run main.go

# In another terminal, test the /info endpoint
curl http://localhost:3001/info
```

You should see detailed geolocation information including:
- IP address
- Country and city
- Latitude/longitude
- ISP/ASN information
- Timezone

## 📚 Database Differences

- **GeoLite2-City**: Most detailed, includes city, coordinates, timezone
- **GeoLite2-Country**: Lighter, country-level only (faster lookups)
- **GeoLite2-ASN**: ASN numbers and ISP organization names

The backend currently uses **GeoLite2-City** for full geolocation features.


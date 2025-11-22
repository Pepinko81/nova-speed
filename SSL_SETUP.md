# SpeedFlux SSL Setup Guide

## Problem: 204 Error Even with Standalone Mode

If you're getting `204 Invalid response` errors **even with standalone mode**, it means you have a **reverse proxy or load balancer** (like Cloudflare, AWS CloudFront, etc.) in front of your server that's blocking or modifying ACME challenge requests.

**Solution: Use DNS-01 Challenge** (see `SSL_SETUP_DNS.md` for detailed instructions)

## Quick Fix for 204 Error (If No Reverse Proxy)

If you're getting `204 Invalid response` errors from certbot and you DON'T have a reverse proxy, use **standalone mode** instead of nginx mode.

## Method 1: Automated Script (Easiest)

```bash
# On your server
cd ~/nova-speed
chmod +x setup-ssl-simple.sh
sudo ./setup-ssl-simple.sh
```

This script will:
1. Create ACME challenge directory
2. Install HTTP-only nginx config
3. Stop nginx temporarily
4. Obtain SSL certificate using standalone mode
5. Configure nginx with SSL
6. Start nginx again

## Method 2: Manual Steps

### Step 1: Install HTTP-only nginx config

```bash
# Copy HTTP-only configuration
sudo cp nginx-speedflux-http-only.conf /etc/nginx/sites-available/speedflux

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

### Step 2: Create ACME challenge directory

```bash
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html/.well-known
sudo chmod -R 755 /var/www/html/.well-known
```

### Step 3: Obtain certificate (standalone mode)

```bash
# Stop nginx (certbot needs port 80)
sudo systemctl stop nginx

# Get certificate
sudo certbot certonly --standalone \
    -d speedflux.hashmatrix.dev \
    --non-interactive \
    --agree-tos \
    --email admin@hashmatrix.dev

# Start nginx
sudo systemctl start nginx
```

### Step 4: Configure nginx with SSL

```bash
# Let certbot configure nginx automatically
sudo certbot --nginx -d speedflux.hashmatrix.dev --redirect
```

If certbot nginx plugin fails, manually edit nginx config:

```bash
sudo nano /etc/nginx/sites-available/speedflux
```

Add HTTPS server block (see `nginx-speedflux.conf` for full example).

### Step 5: Test

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://speedflux.hashmatrix.dev
```

## Why Standalone Mode?

Standalone mode is more reliable because:
- It doesn't depend on nginx configuration
- It temporarily stops nginx and listens on port 80 directly
- It avoids ACME challenge location block conflicts
- It works even if you have multiple nginx sites

**However**, if you have a reverse proxy/load balancer in front of your server, standalone mode won't work either. In that case, use **DNS-01 challenge** (see `SSL_SETUP_DNS.md`).

## Troubleshooting

### Still getting 204 errors?

1. **Check if port 80 is free**:
   ```bash
   sudo lsof -i :80
   ```

2. **Check DNS**:
   ```bash
   dig speedflux.hashmatrix.dev
   # Should point to your server IP
   ```

3. **Check firewall**:
   ```bash
   sudo ufw status
   # Port 80 and 443 should be open
   ```

### Certificate obtained but site not working?

1. **Check certificate files**:
   ```bash
   sudo ls -la /etc/letsencrypt/live/speedflux.hashmatrix.dev/
   ```

2. **Check nginx error log**:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Verify nginx config**:
   ```bash
   sudo nginx -t
   ```

## After SSL is Working

Test automatic renewal:
```bash
sudo certbot renew --dry-run
```

Certbot automatically sets up a systemd timer for renewal, so you don't need to do anything else.


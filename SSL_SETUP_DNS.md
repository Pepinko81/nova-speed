# SpeedFlux SSL Setup - DNS Challenge Method

## Problem: Reverse Proxy / Load Balancer Returns 204

If you're getting `204 Invalid response` errors even with standalone mode, it means you have a **reverse proxy or load balancer** in front of your server that's blocking or modifying ACME challenge requests.

This is common with:
- Cloudflare (free/proxy mode)
- AWS CloudFront
- Other CDN/proxy services
- Load balancers

## Solution: Use DNS-01 Challenge

DNS-01 challenge doesn't require port 80 access. Instead, it uses DNS TXT records for verification.

### Step 1: Obtain Certificate with DNS Challenge

```bash
sudo certbot certonly --manual \
    --preferred-challenges dns \
    -d speedflux.hashmatrix.dev \
    --email admin@hashmatrix.dev \
    --agree-tos \
    --manual-public-ip-logging-ok
```

Certbot will:
1. Generate a challenge token
2. Ask you to add a TXT record to your DNS
3. Wait for you to confirm DNS propagation
4. Verify the TXT record
5. Issue the certificate

### Step 2: Add TXT Record to DNS

When certbot asks, add this TXT record to your DNS:

```
Type: TXT
Name: _acme-challenge.speedflux.hashmatrix.dev
Value: [the token certbot shows you]
TTL: 300 (or auto)
```

**Important:**
- Add the record at your DNS provider (Cloudflare, Namecheap, etc.)
- Wait 1-5 minutes for DNS propagation
- Press Enter in certbot when ready

### Step 3: Configure Nginx

After certificate is obtained:

```bash
# Let certbot configure nginx automatically
sudo certbot --nginx -d speedflux.hashmatrix.dev --redirect
```

Or manually edit nginx config (see `nginx-speedflux.conf`).

### Step 4: Test

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://speedflux.hashmatrix.dev
```

## Automated Script

Use the provided script:

```bash
chmod +x setup-ssl-dns.sh
sudo ./setup-ssl-dns.sh
```

## Certificate Renewal

DNS-01 challenge requires manual intervention for renewal. You have two options:

### Option A: Manual Renewal

```bash
sudo certbot renew --manual --preferred-challenges dns
```

You'll need to add the TXT record again when renewing.

### Option B: Automated Renewal with DNS API

If your DNS provider supports API (e.g., Cloudflare), you can use certbot plugins:

```bash
# For Cloudflare
sudo apt install python3-certbot-dns-cloudflare

# Create API token file
sudo nano /etc/letsencrypt/cloudflare.ini
# Add:
# dns_cloudflare_api_token = YOUR_API_TOKEN

# Obtain certificate with plugin
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    -d speedflux.hashmatrix.dev
```

This allows automatic renewal without manual DNS updates.

## Why This Works

- **No port 80 required**: DNS challenge doesn't need HTTP access
- **Works behind proxy**: Doesn't matter if you have Cloudflare or other proxies
- **More secure**: Only requires DNS control, not server access
- **Reliable**: No conflicts with nginx or other services

## Troubleshooting

### DNS propagation taking too long?

1. Check TXT record:
   ```bash
   dig _acme-challenge.speedflux.hashmatrix.dev TXT
   ```

2. Use different DNS servers:
   ```bash
   dig @8.8.8.8 _acme-challenge.speedflux.hashmatrix.dev TXT
   dig @1.1.1.1 _acme-challenge.speedflux.hashmatrix.dev TXT
   ```

### Certificate obtained but nginx errors?

1. Check certificate files:
   ```bash
   sudo ls -la /etc/letsencrypt/live/speedflux.hashmatrix.dev/
   ```

2. Check nginx error log:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. Verify nginx config:
   ```bash
   sudo nginx -t
   ```


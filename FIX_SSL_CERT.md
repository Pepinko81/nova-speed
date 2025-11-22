# Fix SSL Certificate Error - ERR_CERT_COMMON_NAME_INVALID

## Проблем

Получаваш грешка:
```
Your connection is not private
net::ERR_CERT_COMMON_NAME_INVALID
```

## Причина

SSL сертификатът е издаден за `speedflux.hashmatrix.dev`, но сега използваме `hashmatrix.dev`. Сертификатът не покрива новия домейн.

## Решение

### Стъпка 1: Провери текущия сертификат

```bash
# Провери какви сертификати имаш
sudo certbot certificates

# Провери nginx конфигурацията
sudo nginx -T | grep ssl_certificate
```

### Стъпка 2: Инсталирай нов SSL сертификат за hashmatrix.dev

#### Метод A: Standalone (Препоръчителен)

```bash
# Спри nginx временно
sudo systemctl stop nginx

# Получи нов сертификат за hashmatrix.dev
sudo certbot certonly --standalone \
    -d hashmatrix.dev \
    --email admin@hashmatrix.dev \
    --agree-tos \
    --non-interactive

# Стартирай nginx
sudo systemctl start nginx

# Конфигурирай nginx с новия сертификат
sudo certbot --nginx -d hashmatrix.dev --redirect
```

#### Метод B: Използвай автоматизирания скрипт

```bash
cd ~/nova-speed
git pull origin main
chmod +x setup-ssl-simple.sh
sudo ./setup-ssl-simple.sh
```

### Стъпка 3: Обнови nginx конфигурацията

Ако certbot не обнови автоматично nginx конфигурацията:

```bash
# Редактирай nginx конфигурацията
sudo nano /etc/nginx/sites-available/speedflux
```

Уверети се че SSL сертификатните пътища сочат към правилния домейн:

```nginx
ssl_certificate /etc/letsencrypt/live/hashmatrix.dev/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/hashmatrix.dev/privkey.pem;
```

След това:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Стъпка 4: Проверка

```bash
# Тест на SSL
curl -I https://hashmatrix.dev

# Провери сертификата
openssl s_client -connect hashmatrix.dev:443 -servername hashmatrix.dev < /dev/null 2>/dev/null | openssl x509 -noout -subject -dates
```

## Важно

- **Старият сертификат** за `speedflux.hashmatrix.dev` може да остане, но няма да се използва
- **Новият сертификат** за `hashmatrix.dev` трябва да работи правилно
- Certbot автоматично настройва auto-renewal за новия сертификат

## Ако все още има проблеми

1. **Провери DNS:**
   ```bash
   dig hashmatrix.dev A
   # Трябва да сочи към твоя сървър IP
   ```

2. **Провери firewall:**
   ```bash
   sudo ufw status
   # Порт 80 и 443 трябва да са отворени
   ```

3. **Провери nginx error log:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Изчисти browser cache:**
   - Chrome/Edge: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
   - Избери "Cached images and files"

## След успешна инсталация

Сертификатът ще се обновява автоматично. Провери:
```bash
sudo certbot renew --dry-run
```


# Fix Nginx Errors - Quick Guide

## Проблеми в nginx error log

### 1. Липсва favicon.ico

**Грешка:**
```
open() "/var/www/speedflux/favicon.ico" failed (2: No such file or directory)
```

**Решение:**
```bash
# Създай favicon.ico от HashMatrix.png или използвай placeholder
cd ~/nova-speed
sudo cp public/HashMatrix.png /var/www/speedflux/favicon.ico
# Или създай празен favicon
touch /tmp/favicon.ico
sudo mv /tmp/favicon.ico /var/www/speedflux/favicon.ico
sudo chown www-data:www-data /var/www/speedflux/favicon.ico
```

### 2. Frontend не е деплойнат

**Грешка:**
```
ls: cannot access '/var/www/speedflux/': No such file or directory
```

**Решение:**
```bash
# Създай директорията
sudo mkdir -p /var/www/speedflux

# Build frontend
cd ~/nova-speed
npm run build

# Копирай файловете
sudo cp -r dist/* /var/www/speedflux/

# Fix permissions
sudo chown -R www-data:www-data /var/www/speedflux
sudo chmod -R 755 /var/www/speedflux

# Reload nginx
sudo systemctl reload nginx
```

### 3. Rewrite cycle за hashmatrix.de

**Грешка:**
```
rewrite or internal redirection cycle while internally redirecting to "/index.html"
```

**Решение:**
Това е проблем с nginx конфигурацията за `hashmatrix.de` (не `.dev`). Провери:

```bash
# Провери всички nginx конфигурации
sudo nginx -T | grep -A 20 "server_name.*hashmatrix"

# Ако има проблемна конфигурация, поправи я или деактивирай
sudo ls -la /etc/nginx/sites-enabled/
# Премахни проблемния symlink ако има такъв
```

## Пълно решение (всички проблеми наведнъж)

```bash
# 1. Build frontend
cd ~/nova-speed
npm run build

# 2. Създай web директория
sudo mkdir -p /var/www/speedflux

# 3. Копирай файловете
sudo cp -r dist/* /var/www/speedflux/

# 4. Създай favicon (от HashMatrix.png или placeholder)
sudo cp public/HashMatrix.png /var/www/speedflux/favicon.ico 2>/dev/null || \
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d | sudo tee /var/www/speedflux/favicon.ico > /dev/null

# 5. Fix permissions
sudo chown -R www-data:www-data /var/www/speedflux
sudo chmod -R 755 /var/www/speedflux

# 6. Провери nginx конфигурацията
sudo nginx -t

# 7. Reload nginx
sudo systemctl reload nginx

# 8. Провери дали работи
curl -I https://hashmatrix.dev/
```

## Проверка

```bash
# Провери дали файловете са на място
ls -la /var/www/speedflux/

# Провери nginx error log
sudo tail -f /var/log/nginx/error.log

# Тест на сайта
curl -I https://hashmatrix.dev/
```

## Забележки

- **favicon.ico** грешките не са критични, но е добре да ги поправиш
- **Frontend deployment** е задължителен за да работи сайтът
- **Rewrite cycle** за `hashmatrix.de` може да е от друга nginx конфигурация (друг сайт)


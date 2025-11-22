# SpeedFlux - Финален Setup Guide

## 🎯 Финален Setup за hashmatrix.dev

### Стъпка 1: Обнови кода на сървъра

```bash
cd ~/nova-speed
git pull origin main
```

### Стъпка 2: Провери DNS настройките

Уверети се, че `hashmatrix.dev` сочи към твоя сървър:

```bash
# Провери DNS
dig hashmatrix.dev A
dig hashmatrix.dev AAAA

# Трябва да виждаш IP адреса на твоя сървър
```

### Стъпка 3: Обнови nginx конфигурацията

```bash
# Копирай HTTP-only конфигурацията
sudo cp nginx-speedflux-http-only.conf /etc/nginx/sites-available/speedflux

# Създай symlink ако не съществува
sudo ln -sf /etc/nginx/sites-available/speedflux /etc/nginx/sites-enabled/speedflux

# Тест и рестарт
sudo nginx -t
sudo systemctl reload nginx
```

### Стъпка 4: Обнови backend конфигурацията

```bash
# Рестартирай backend service за да зареди новите CORS настройки
sudo systemctl restart speedflux-backend

# Провери дали работи
curl http://localhost:3001/health
```

### Стъпка 5: Инсталирай SSL сертификат

**Изчакай rate limit-а да изтече** (ако все още е активен).

След това използвай един от методите:

#### Метод A: Standalone (Препоръчителен)

```bash
# Спри nginx временно
sudo systemctl stop nginx

# Получи сертификат
sudo certbot certonly --standalone \
    -d hashmatrix.dev \
    --email admin@hashmatrix.dev \
    --agree-tos \
    --non-interactive

# Стартирай nginx
sudo systemctl start nginx

# Конфигурирай nginx с SSL
sudo certbot --nginx -d hashmatrix.dev --redirect
```

#### Метод B: Автоматизиран скрипт

```bash
chmod +x setup-ssl-simple.sh
sudo ./setup-ssl-simple.sh
```

### Стъпка 6: Проверка

```bash
# Тест на SSL
curl -I https://hashmatrix.dev

# Тест на backend
curl https://hashmatrix.dev/health
curl https://hashmatrix.dev/info

# Тест на frontend
curl -I https://hashmatrix.dev/
```

### Стъпка 7: Деплой на frontend

**ВАЖНО:** Това трябва да се направи, иначе сайтът няма да работи!

```bash
# Rebuild frontend
cd ~/nova-speed
npm run build

# Създай web директория (ако не съществува)
sudo mkdir -p /var/www/speedflux

# Копирай новите файлове
sudo cp -r dist/* /var/www/speedflux/

# Създай favicon.ico (от HashMatrix.png)
sudo cp public/HashMatrix.png /var/www/speedflux/favicon.ico

# Fix permissions
sudo chown -R www-data:www-data /var/www/speedflux
sudo chmod -R 755 /var/www/speedflux

# Reload nginx
sudo systemctl reload nginx
```

**Проверка:**
```bash
# Провери дали файловете са на място
ls -la /var/www/speedflux/

# Тест
curl -I https://hashmatrix.dev/
```

## ✅ Checklist

- [ ] DNS сочи към правилния IP адрес
- [ ] Nginx конфигурацията е обновена
- [ ] Backend service е рестартиран
- [ ] SSL сертификат е инсталиран
- [ ] Frontend е обновен
- [ ] Всички endpoints работят

## 🔧 Полезни команди

```bash
# Проверка на backend
sudo systemctl status speedflux-backend
sudo journalctl -u speedflux-backend -f

# Проверка на nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Проверка на SSL
sudo certbot certificates
sudo certbot renew --dry-run
```

## 🐛 Troubleshooting

### Nginx Errors (favicon.ico, missing files)

Ако виждаш грешки в `/var/log/nginx/error.log`:

```bash
# Виж FIX_NGINX_ERRORS.md за пълно решение

# Бързо решение:
# 1. Уверети се че frontend е деплойнат (Стъпка 7)
# 2. Създай favicon
sudo cp ~/nova-speed/public/HashMatrix.png /var/www/speedflux/favicon.ico
sudo chown www-data:www-data /var/www/speedflux/favicon.ico
```

### SSL не работи

1. Провери DNS:
   ```bash
   dig hashmatrix.dev A
   ```

2. Провери nginx конфигурацията:
   ```bash
   sudo nginx -t
   ```

3. Провери сертификатите:
   ```bash
   sudo ls -la /etc/letsencrypt/live/hashmatrix.dev/
   ```

### Backend не работи

1. Провери service:
   ```bash
   sudo systemctl status speedflux-backend
   ```

2. Провери логове:
   ```bash
   sudo journalctl -u speedflux-backend -n 50
   ```

3. Тест локално:
   ```bash
   curl http://localhost:3001/health
   ```

### Frontend не работи

1. Провери файлове:
   ```bash
   ls -la /var/www/speedflux/
   ```

2. Провери nginx error log:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

## 📝 Важни бележки

- **Domain**: Сега използваме `hashmatrix.dev` (основният домейн)
- **CORS**: Backend е конфигуриран за `https://hashmatrix.dev` и `https://www.hashmatrix.dev`
- **SSL**: Certbot автоматично обновява nginx конфигурацията
- **Auto-renewal**: Certbot автоматично настройва renewal (провери с `sudo certbot renew --dry-run`)

## 🎉 Готово!

След като завършиш всички стъпки, твоят SpeedFlux сайт трябва да работи на:
- **Frontend**: https://hashmatrix.dev
- **Backend API**: https://hashmatrix.dev/api/
- **WebSocket**: wss://hashmatrix.dev/ws/
- **IP Info**: https://hashmatrix.dev/info


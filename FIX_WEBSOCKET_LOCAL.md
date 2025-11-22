# Fix WebSocket Connection from Local Network

## Проблем

От локална мрежа (лаптоп, телефон) upload тестът не работи с грешка:
```
Failed to connect to upload test server
```

От външна мрежа работи нормално.

## Причини

1. **CORS настройки** - Backend не позволява connections от локална мрежа
2. **Nginx WebSocket proxy** - Може да има проблеми с WebSocket upgrade
3. **Backend не слуша на правилния интерфейс** - Може да слуша само на localhost

## Решение

### Стъпка 1: Обнови CORS настройките в backend

```bash
# Редактирай systemd service файла
sudo systemctl edit speedflux-backend
```

Добави или обнови `ALLOWED_ORIGINS`:

```ini
[Service]
Environment="ALLOWED_ORIGINS=https://hashmatrix.dev,https://www.hashmatrix.dev,http://localhost:3000,http://localhost:5173,http://192.168.0.0/16,http://10.0.0.0/8,http://172.16.0.0/12"
```

Или за по-лесно тестване, временно използвай `*`:

```ini
[Service]
Environment="ALLOWED_ORIGINS=*"
```

След това:
```bash
sudo systemctl daemon-reload
sudo systemctl restart speedflux-backend
```

### Стъпка 2: Провери nginx WebSocket конфигурацията

Уверети се че nginx правилно проксира WebSocket:

```bash
# Провери текущата конфигурация
sudo nginx -T | grep -A 15 "location /ws/"
```

Трябва да виждаш:
```nginx
location /ws/ {
    proxy_pass http://localhost:3001/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ...
}
```

### Стъпка 3: Провери backend логове

```bash
# Провери дали има CORS грешки
sudo journalctl -u speedflux-backend -f | grep -i cors

# Провери WebSocket connection логове
sudo journalctl -u speedflux-backend -f | grep -i websocket
```

### Стъпка 4: Тест на WebSocket connection

От браузъра (конзола):
```javascript
// Тест на WebSocket connection
const ws = new WebSocket('wss://hashmatrix.dev/ws/ping');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = (e) => console.log('Closed:', e.code, e.reason);
```

### Стъпка 5: Провери firewall

```bash
# Провери дали порт 3001 е достъпен (ако backend слуша директно)
sudo ufw status
sudo netstat -tlnp | grep 3001
```

## Алтернативно решение: Използвай директно backend порт (за тестване)

Ако проблемът е в nginx, можеш временно да тестваш директно с backend:

1. Отвори firewall за порт 3001 (само за тестване!)
2. Промени frontend да използва `ws://[SERVER_IP]:3001` вместо `wss://hashmatrix.dev`

**ВНИМАНИЕ:** Това не е безопасно за production! Използвай само за тестване.

## Проверка

След промените:

1. Рестартирай backend:
   ```bash
   sudo systemctl restart speedflux-backend
   ```

2. Рестартирай nginx:
   ```bash
   sudo systemctl reload nginx
   ```

3. Тест от локална мрежа:
   - Отвори https://hashmatrix.dev от лаптоп/телефон
   - Стартирай speed test
   - Провери дали upload тестът работи

## Debugging

Ако все още не работи:

1. **Провери browser console** за CORS грешки
2. **Провери nginx error log**: `sudo tail -f /var/log/nginx/error.log`
3. **Провери backend logs**: `sudo journalctl -u speedflux-backend -f`
4. **Тест WebSocket директно**: Използвай browser console за WebSocket connection

## Често срещани проблеми

### Проблем: CORS error в browser console

**Решение:** Обнови `ALLOWED_ORIGINS` в backend service файла.

### Проблем: WebSocket connection timeout

**Решение:** Провери nginx WebSocket proxy настройките и timeouts.

### Проблем: 502 Bad Gateway

**Решение:** Провери дали backend работи: `curl http://localhost:3001/health`


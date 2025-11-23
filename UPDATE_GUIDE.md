# SpeedFlux Auto-Update Guide

## Обзор

Скриптът `update-app.sh` автоматично обновява SpeedFlux приложението като:
1. Тегли последните промени от GitHub
2. Компилира backend
3. Компилира frontend
4. Инсталира файловете в production локации
5. Рестартира services

**ВАЖНО:** Скриптът НЕ променя nginx или SSL конфигурации!

## Използване

### Базово използване

```bash
cd /home/pepinko/nova-speed
sudo ./update-app.sh
```

### С конкретен branch

```bash
GIT_BRANCH=main sudo ./update-app.sh
```

## Какво прави скриптът

### 1. Проверка на предварителни изисквания
- Проверява дали Go е инсталиран
- Проверява дали npm е инсталиран
- Проверява дали git е инсталиран
- Проверява дали сме в git repository

### 2. Теглене от GitHub
- Проверява за uncommitted промени и ги stash-ва
- Fetch-ва последните промени от GitHub
- Pull-ва промените (ако има такива)
- Ако няма нови промени, излиза с успех

### 3. Компилиране на Backend
- Изтегля Go dependencies
- Компилира Go binary в `bin/nova-speed-backend`
- Обработва случаите когато се изпълнява с sudo

### 4. Компилиране на Frontend
- Инсталира npm dependencies (ако е необходимо)
- Компилира frontend за production в `dist/`

### 5. Инсталиране на Backend
- Спира `speedflux-backend` service
- Копира binary в `/opt/speedflux/nova-speed-backend`
- Задава правилни permissions
- Рестартира service

### 6. Инсталиране на Frontend
- Копира всички файлове от `dist/` в `/var/www/speedflux/`
- Задава правилни permissions (www-data:www-data)

### 7. Верификация
- Проверява дали service работи
- Проверява health endpoint
- Проверява дали frontend файловете са налични

## Примерен изход

```
==========================================
  SpeedFlux Auto-Update Script
==========================================

[INFO] Checking prerequisites...
[SUCCESS] Go found: go1.21.5
[SUCCESS] npm found: 10.2.3
[SUCCESS] git found: 2.34.1

[INFO] Pulling latest changes from GitHub (branch: main)...
[INFO] New updates available. Pulling...
[SUCCESS] Successfully pulled latest changes

[INFO] Building backend...
[SUCCESS] Backend built successfully

[INFO] Building frontend...
[SUCCESS] Frontend built successfully

[INFO] Installing backend to /opt/speedflux...
[SUCCESS] Backend installed to /opt/speedflux
[SUCCESS] Service started successfully

[INFO] Installing frontend to /var/www/speedflux...
[SUCCESS] Frontend installed to /var/www/speedflux

[INFO] Verifying installation...
[SUCCESS] Backend service is running
[SUCCESS] Backend health check passed
[SUCCESS] Frontend files installed

[SUCCESS] ==========================================
[SUCCESS]   Update completed successfully!
[SUCCESS] ==========================================
```

## Грешки и отстраняване

### Скриптът не може да намери Go
```bash
# Провери дали Go е в PATH
which go
echo $PATH

# Ако не е, добави го
export PATH="$PATH:/usr/local/go/bin"
```

### Скриптът не може да компилира backend
```bash
# Провери Go версията
go version

# Провери дали имаш права
ls -la bin/

# Опитай ръчно
cd backend
go build -o ../bin/nova-speed-backend ./main.go
```

### Service не стартира
```bash
# Провери статуса
sudo systemctl status speedflux-backend

# Провери логовете
sudo journalctl -u speedflux-backend -n 50

# Провери дали binary съществува
ls -la /opt/speedflux/nova-speed-backend
```

### Frontend не се показва
```bash
# Провери дали файловете са копирани
ls -la /var/www/speedflux/

# Провери permissions
ls -la /var/www/speedflux/index.html

# Провери nginx конфигурацията (ръчно)
sudo nginx -t
```

## Безопасност

- Скриптът не променя nginx конфигурации
- Скриптът не променя SSL сертификати
- Скриптът не променя systemd service файлове (освен ако не е необходимо)
- Uncommitted промени се stash-ват автоматично

## Автоматизация

Можеш да настроиш автоматично обновяване с cron:

```bash
# Редактирай crontab
crontab -e

# Добави ред за ежедневно обновяване в 3:00 сутринта
0 3 * * * cd /home/pepinko/nova-speed && /usr/bin/sudo /home/pepinko/nova-speed/update-app.sh >> /var/log/speedflux-update.log 2>&1
```

## Ръчно обновяване (ако скриптът не работи)

```bash
# 1. Pull от GitHub
cd /home/pepinko/nova-speed
git pull origin main

# 2. Build backend
cd backend
go build -o ../bin/nova-speed-backend ./main.go

# 3. Build frontend
cd ..
npm run build

# 4. Install backend
sudo systemctl stop speedflux-backend
sudo cp bin/nova-speed-backend /opt/speedflux/
sudo systemctl start speedflux-backend

# 5. Install frontend
sudo cp -r dist/* /var/www/speedflux/
sudo chown -R www-data:www-data /var/www/speedflux
```

## Забележки

- Скриптът изисква sudo права за инсталиране на файлове и управление на services
- Ако имаш uncommitted промени, те ще бъдат stash-нати автоматично
- Скриптът проверява дали има нови промени преди да започне build процеса
- Ако няма нови промени, скриптът излиза веднага


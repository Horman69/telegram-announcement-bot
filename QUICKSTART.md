# 🚀 Быстрый старт - Деплой на VPS

## Подключение к серверу
```bash
ssh root@YOUR_SERVER_IP
```

## Первоначальная настройка (один раз)

```bash
# 1. Обновление системы
apt update && apt upgrade -y

# 2. Создание пользователя
adduser botuser
usermod -aG sudo botuser
su - botuser

# 3. Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Установка PM2
sudo npm install -g pm2

# 5. Установка Git
sudo apt install git -y
```

## Деплой бота

```bash
# 1. Клонирование репозитория
cd ~
git clone https://github.com/YOUR_USERNAME/telegram-announcement-bot.git
cd telegram-announcement-bot

# 2. Установка зависимостей
npm install --production

# 3. Настройка .env
nano .env
# Вставьте:
# TELEGRAM_BOT_TOKEN=your_token_here
# NODE_ENV=production

# 4. Создание директории для логов
mkdir -p logs

# 5. Запуск бота
npm run deploy

# 6. Настройка автозапуска
pm2 save
pm2 startup
# Выполните команду, которую покажет PM2
```

## Управление ботом

```bash
# Статус
pm2 status

# Логи (реальное время)
pm2 logs announcement-bot

# Перезапуск
pm2 restart announcement-bot

# Остановка
pm2 stop announcement-bot
```

## Обновление бота

```bash
cd ~/telegram-announcement-bot
pm2 stop announcement-bot
git pull origin main
npm install --production
pm2 restart announcement-bot
pm2 logs announcement-bot --lines 50
```

## Полезные команды

```bash
# Мониторинг ресурсов
pm2 monit

# Детальная информация
pm2 show announcement-bot

# Очистка логов
pm2 flush

# Просмотр файлов логов
tail -f logs/out.log
tail -f logs/error.log
```

## Troubleshooting

```bash
# Проверить логи ошибок
pm2 logs announcement-bot --err --lines 100

# Проверить .env файл
cat .env

# Перезапустить бота
pm2 restart announcement-bot

# Проверить использование диска
df -h

# Проверить использование памяти
free -h
```

## Запуск нескольких ботов

```bash
# Для каждого нового бота:
cd ~
git clone https://github.com/user/bot-name.git
cd bot-name
npm install --production
nano .env  # настроить токен
pm2 start ecosystem.config.js --env production
pm2 save
```

---

Подробная инструкция: см. **DEPLOYMENT.md**

# 📧 Telegram Gmail Bot

Telegram бот для автоматического получения кодов верификации из Gmail с поддержкой множественных почтовых аккаунтов.

## 🚀 Возможности

- ✅ Поддержка неограниченного количества Gmail аккаунтов
- ✅ Получение кодов в реальном времени через Gmail Push Notifications
- ✅ Автоматическое извлечение кодов из писем (цифровые и буквенно-цифровые)
- ✅ Безопасная OAuth2 авторизация
- ✅ Хранение токенов в MongoDB
- ✅ Простой интерфейс управления аккаунтами

## 📋 Требования

- Node.js >= 16.x
- MongoDB >= 4.x
- Google Cloud Platform аккаунт
- Telegram Bot Token

## 🛠 Установка

### 1. Клонирование и установка зависимостей

\`\`\`bash
# Установи зависимости
npm install
\`\`\`

### 2. Настройка Google Cloud Platform

#### Создание проекта и OAuth credentials:

1. Перейди в [Google Cloud Console](https://console.cloud.google.com)
2. Создай новый проект
3. Включи **Gmail API**:
   - APIs & Services → Library → Gmail API → Enable
4. Настрой OAuth consent screen:
   - APIs & Services → OAuth consent screen
   - Выбери "External" (или Internal для организации)
   - Заполни обязательные поля
   - Добавь тестовых пользователей (свои Gmail аккаунты)
5. Создай OAuth 2.0 Client ID:
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Тип: **Desktop app**
   - Скачай JSON файл и переименуй в \`credentials.json\`
   - Положи файл в корень проекта

#### Настройка Cloud Pub/Sub:

1. Включи **Cloud Pub/Sub API**:
   - APIs & Services → Library → Cloud Pub/Sub API → Enable

2. Создай Topic:
   - Pub/Sub → Topics → Create Topic
   - Название: \`gmail-notifications\` (или любое другое)
   - Запомни полное имя: \`projects/YOUR_PROJECT_ID/topics/gmail-notifications\`
                           projects/codegram-473918/topics/gmail-notifications
3. Добавь права для Gmail:
   - Открой созданный Topic
   - Permissions → Add Principal
   - Principal: \`gmail-api-push@system.gserviceaccount.com\`
   - Role: **Pub/Sub Publisher**

4. Создай Subscription:
   - Pub/Sub → Subscriptions → Create Subscription
   - Subscription ID: \`gmail-notifications-sub\`
   - Select a Cloud Pub/Sub topic: выбери созданный topic
   - Delivery type: **Push**
   - Endpoint URL: \`https://your-domain.com/gmail-webhook\` (URL твоего сервера)

### 3. Настройка переменных окружения

Создай файл \`.env\` на основе \`.env.example\`:

\`\`\`env
# Получи у @BotFather в Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# MongoDB (локальный или облачный)
MONGODB_URI=mongodb://localhost:27017/gmail-bot

# Твой Pub/Sub Topic из Google Cloud
PUBSUB_TOPIC=projects/your-project-id/topics/gmail-notifications

# Порт для webhook сервера
PORT=3000
\`\`\`

### 4. Развертывание вебхука

Для работы Push Notifications нужен публичный HTTPS URL. Варианты:

#### Вариант A: ngrok (для разработки)

\`\`\`bash
# Установи ngrok
npm install -g ngrok

# Запусти туннель
ngrok http 3000

# Скопируй HTTPS URL и используй его в Pub/Sub Subscription
\`\`\`

#### Вариант B: VPS/Cloud (для продакшена)

1. Разверни на VPS (DigitalOcean, AWS, Google Cloud)
2. Настрой NGINX с SSL (Let's Encrypt)
3. Проксируй запросы на порт 3000

### 5. Установка MongoDB

\`\`\`bash
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS
brew install mongodb-community

# Или используй облачный MongoDB Atlas (бесплатно)
# https://www.mongodb.com/cloud/atlas
\`\`\`

## 🚀 Запуск

\`\`\`bash
# Разработка
npm run dev

# Продакшен
npm start
\`\`\`

## 📱 Использование

### Команды бота:

- \`/start\` - Начало работы
- \`/add\` - Добавить Gmail аккаунт
- \`/list\` - Список подключенных аккаунтов
- \`/remove\` - Удалить аккаунт
- \`/help\` - Помощь

### Добавление Gmail аккаунта:

1. Отправь \`/add\` боту
2. Перейди по ссылке для авторизации
3. Войди в Gmail аккаунт
4. Разреши доступ к почте
5. Скопируй код и отправь боту
6. Готово! Коды будут приходить автоматически

## 🔒 Безопасность

- Используется OAuth2 авторизация
- Токены хранятся зашифрованно в MongoDB
- Доступ только на чтение писем
- Каждый пользователь видит только свои аккаунты

## 🐛 Решение проблем

### Ошибка "credentials.json not found"
- Проверь, что файл \`credentials.json\` находится в корне проекта
- Убедись, что скачал правильный OAuth 2.0 Client ID (Desktop app)

### Ошибка подключения к MongoDB
- Проверь, что MongoDB запущен: \`sudo systemctl status mongodb\`
- Проверь правильность MONGODB_URI в .env

### Коды не приходят
- Убедись, что вебхук доступен по HTTPS
- Проверь Pub/Sub Subscription и права для \`gmail-api-push@system.gserviceaccount.com\`
- Проверь логи сервера

### Ошибка "Invalid grant"
- Токен истек, удали аккаунт через \`/remove\` и добавь заново

## 📊 Структура проекта

\`\`\`
telegram-gmail-bot/
├── index.js              # Основной файл бота
├── gmailAuth.js          # OAuth2 авторизация
├── gmailWatcher.js       # Отслеживание писем через Pub/Sub
├── codeExtractor.js      # Извлечение кодов из писем
├── database.js           # MongoDB модели и функции
├── credentials.json      # OAuth credentials (не в git)
├── package.json          # Зависимости
├── .env                  # Переменные окружения (не в git)
└── README.md             # Документация
\`\`\`

## 🤝 Поддержка

При возникновении проблем:
1. Проверь логи сервера
2. Убедись, что все API включены в Google Cloud
3. Проверь правильность настройки Pub/Sub

## 📝 Лицензия

ISC

## 🔗 Полезные ссылки

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)

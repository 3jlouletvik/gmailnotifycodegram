require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { connectDB, saveUserTokens, getUserAccounts, removeAccount } = require('./database');
const { getAuthUrl, getTokensFromCode } = require('./gmailAuth');
const { startWatching, getHistoryChanges, getMessage } = require('./gmailWatcher');
const { extractVerificationCode } = require('./codeExtractor');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const app = express();
app.use(express.json());

const pendingAuths = new Map(); // Временное хранение процессов авторизации

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    '👋 *Привет!* Я помогу тебе получать коды верификации из Gmail прямо в Telegram.\n\n' +
    '*Команды:*\n' +
    '/add - Добавить Gmail аккаунт\n' +
    '/list - Список подключенных аккаунтов\n' +
    '/remove - Удалить аккаунт\n' +
    '/help - Помощь',
    { parse_mode: 'Markdown' }
  );
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    '*📖 Инструкция по использованию*\n\n' +
    '*1. Добавление аккаунта*\n' +
    'Используй /add и следуй инструкциям\n\n' +
    '*2. Авторизация*\n' +
    '• Перейди по ссылке\n' +
    '• Войди в Gmail\n' +
    '• Разреши доступ\n' +
    '• Скопируй код\n\n' +
    '*3. Получение кодов*\n' +
    'Коды будут приходить автоматически!\n\n' +
    '*Поддержка:* @your_support',
    { parse_mode: 'Markdown' }
  );
});

// Команда /add - добавление Gmail аккаунта
bot.onText(/\/add/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const { authUrl, oAuth2Client } = await getAuthUrl();
    pendingAuths.set(chatId, oAuth2Client);

    bot.sendMessage(chatId,
      '🔐 *Для добавления Gmail аккаунта:*\n\n' +
      '1️⃣ Перейди по ссылке ниже\n' +
      '2️⃣ Войди в Gmail аккаунт\n' +
      '3️⃣ Разреши доступ\n' +
      '4️⃣ Скопируй код и отправь мне\n\n' +
      `[🔗 Ссылка для авторизации](${authUrl})`,
      { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true 
      }
    );
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка при создании ссылки авторизации. Проверь наличие credentials.json');
    console.error(error);
  }
});

// Обработка кода авторизации
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  if (pendingAuths.has(chatId)) {
    const loadingMsg = await bot.sendMessage(chatId, '⏳ Авторизация...');

    try {
      const oAuth2Client = pendingAuths.get(chatId);
      const tokens = await getTokensFromCode(text, oAuth2Client);

      // Получаем email пользователя
      const gmail = require('googleapis').google.gmail({ version: 'v1', auth: oAuth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const email = profile.data.emailAddress;

      // Запускаем отслеживание
      const historyId = await startWatching(tokens, email);

      // Сохраняем в базу
      await saveUserTokens(chatId, email, tokens, historyId);

      pendingAuths.delete(chatId);

      await bot.deleteMessage(chatId, loadingMsg.message_id);
      bot.sendMessage(chatId, 
        `✅ *Gmail аккаунт успешно добавлен!*\n\n` +
        `📧 Email: \`${email}\`\n\n` +
        `Теперь коды верификации будут приходить сюда автоматически.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      await bot.deleteMessage(chatId, loadingMsg.message_id);
      bot.sendMessage(chatId, '❌ Неверный код авторизации. Попробуй /add снова.');
      pendingAuths.delete(chatId);
      console.error(error);
    }
  }
});

// Команда /list - список аккаунтов
bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const accounts = await getUserAccounts(chatId);

    if (accounts.length === 0) {
      bot.sendMessage(chatId, 
        '📭 У тебя нет подключенных аккаунтов.\n\nИспользуй /add для добавления.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let message = '*📋 Подключенные аккаунты:*\n\n';
    accounts.forEach((acc, index) => {
      const date = new Date(acc.addedAt).toLocaleDateString('ru-RU');
      message += `${index + 1}. \`${acc.email}\`\n   Добавлен: ${date}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка при загрузке аккаунтов');
    console.error(error);
  }
});

// Команда /remove - удаление аккаунта
bot.onText(/\/remove/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const accounts = await getUserAccounts(chatId);

    if (accounts.length === 0) {
      bot.sendMessage(chatId, '📭 У тебя нет подключенных аккаунтов.');
      return;
    }

    const keyboard = accounts.map((acc, index) => [{
      text: `${index + 1}. ${acc.email}`,
      callback_data: `remove_${acc.email}`
    }]);

    keyboard.push([{ text: '❌ Отмена', callback_data: 'cancel_remove' }]);

    bot.sendMessage(chatId, 
      '*Выбери аккаунт для удаления:*',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка при загрузке аккаунтов');
    console.error(error);
  }
});

// Обработка callback для удаления
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('remove_')) {
    const email = data.replace('remove_', '');

    try {
      await removeAccount(chatId, email);
      bot.answerCallbackQuery(query.id, { text: '✅ Аккаунт удален' });
      bot.editMessageText(
        `✅ Аккаунт \`${email}\` успешно удален.`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );
    } catch (error) {
      bot.answerCallbackQuery(query.id, { text: '❌ Ошибка удаления' });
      console.error(error);
    }
  } else if (data === 'cancel_remove') {
    bot.answerCallbackQuery(query.id);
    bot.deleteMessage(chatId, query.message.message_id);
  }
});

// Webhook для Pub/Sub уведомлений
app.post('/gmail-webhook', async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.data) {
      return res.status(400).send('Invalid message');
    }

    // Декодируем данные
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const { emailAddress, historyId } = data;

    console.log(`📬 Новое уведомление для ${emailAddress}, historyId: ${historyId}`);

    // Находим пользователя с этим email
    const User = require('./database').User;
    const users = await User.find({ 'gmailAccounts.email': emailAddress });

    for (const user of users) {
      const account = user.gmailAccounts.find(acc => acc.email === emailAddress);
      if (!account) continue;

      // Получаем изменения
      const history = await getHistoryChanges(account.tokens, account.historyId);

      for (const historyItem of history) {
        if (historyItem.messagesAdded) {
          for (const msgAdded of historyItem.messagesAdded) {
            const message = await getMessage(account.tokens, msgAdded.message.id);
            const { codes, subject, from } = extractVerificationCode(message);

            if (codes.length > 0) {
              let botMessage = `🔑 *Новый код верификации!*\n\n`;
              botMessage += `📧 От: \`${from}\`\n`;
              botMessage += `📝 Тема: ${subject}\n\n`;
              botMessage += `*Коды:* ${codes.map(c => \`\\`${c}\\`\`).join(', ')}`;

              await bot.sendMessage(user.telegramId, botMessage, { parse_mode: 'Markdown' });
              console.log(`✅ Код отправлен пользователю ${user.telegramId}`);
            }
          }
        }
      }

      // Обновляем historyId
      await require('./database').updateHistoryId(user.telegramId, emailAddress, historyId);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Запуск
async function start() {
  try {
    await connectDB();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`\n✅ Webhook сервер запущен на порту ${PORT}`);
      console.log(`✅ Бот запущен и готов к работе!\n`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска:', error);
    process.exit(1);
  }
}

start();

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

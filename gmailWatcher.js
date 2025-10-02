const { google } = require('googleapis');
const { createAuthClient } = require('./gmailAuth');

async function startWatching(tokens, email) {
  try {
    const auth = createAuthClient(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: process.env.PUBSUB_TOPIC
      }
    });

    console.log(`✅ Отслеживание запущено для ${email}, historyId: ${res.data.historyId}`);
    return res.data.historyId;
  } catch (error) {
    console.error(`❌ Ошибка запуска отслеживания для ${email}:`, error.message);
    throw error;
  }
}

async function getHistoryChanges(tokens, historyId) {
  try {
    const auth = createAuthClient(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded']
    });

    return res.data.history || [];
  } catch (error) {
    console.error('❌ Ошибка получения истории:', error.message);
    return [];
  }
}

async function getMessage(tokens, messageId) {
  try {
    const auth = createAuthClient(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    return res.data;
  } catch (error) {
    console.error('❌ Ошибка получения сообщения:', error.message);
    throw error;
  }
}

async function getRecentMessages(tokens, maxResults = 10) {
  try {
    const auth = createAuthClient(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['INBOX']
    });

    return res.data.messages || [];
  } catch (error) {
    console.error('❌ Ошибка получения последних сообщений:', error.message);
    return [];
  }
}

module.exports = { 
  startWatching, 
  getHistoryChanges, 
  getMessage,
  getRecentMessages 
};

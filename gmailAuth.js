const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.metadata'
];

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function getAuthUrl() {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.web || credentials.installed;


    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });

    return { authUrl, oAuth2Client };
  } catch (error) {
    console.error('❌ Ошибка чтения credentials.json:', error.message);
    throw new Error('Файл credentials.json не найден. Скачай его из Google Cloud Console');
  }
}

async function getTokensFromCode(code, oAuth2Client) {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    return tokens;
  } catch (error) {
    console.error('❌ Ошибка получения токенов:', error.message);
    throw error;
  }
}

function createAuthClient(tokens) {
  try {
    const credentials = require('./credentials.json');
    const { client_secret, client_id, redirect_uris } = credentials.web || credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    oAuth2Client.setCredentials(tokens);
    return oAuth2Client;
  } catch (error) {
    console.error('❌ Ошибка создания auth client:', error.message);
    throw error;
  }
}

module.exports = { getAuthUrl, getTokensFromCode, createAuthClient };

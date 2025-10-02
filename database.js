const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  gmailAccounts: [{
    email: String,
    tokens: Object,
    historyId: String,
    addedAt: { type: Date, default: Date.now }
  }]
});

const User = mongoose.model('User', userSchema);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ База данных подключена');
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error);
    process.exit(1);
  }
}

async function saveUserTokens(telegramId, email, tokens, historyId) {
  try {
    await User.findOneAndUpdate(
      { telegramId },
      { 
        $push: { 
          gmailAccounts: { email, tokens, historyId } 
        } 
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Токены сохранены для ${email}`);
  } catch (error) {
    console.error('❌ Ошибка сохранения токенов:', error);
    throw error;
  }
}

async function getUserAccounts(telegramId) {
  try {
    const user = await User.findOne({ telegramId });
    return user ? user.gmailAccounts : [];
  } catch (error) {
    console.error('❌ Ошибка получения аккаунтов:', error);
    return [];
  }
}

async function updateHistoryId(telegramId, email, historyId) {
  try {
    await User.updateOne(
      { telegramId, 'gmailAccounts.email': email },
      { $set: { 'gmailAccounts.$.historyId': historyId } }
    );
    console.log(`✅ HistoryId обновлен для ${email}`);
  } catch (error) {
    console.error('❌ Ошибка обновления historyId:', error);
  }
}

async function removeAccount(telegramId, email) {
  try {
    await User.updateOne(
      { telegramId },
      { $pull: { gmailAccounts: { email } } }
    );
    console.log(`✅ Аккаунт ${email} удален`);
  } catch (error) {
    console.error('❌ Ошибка удаления аккаунта:', error);
    throw error;
  }
}

module.exports = { 
  connectDB, 
  saveUserTokens, 
  getUserAccounts, 
  updateHistoryId, 
  removeAccount,
  User 
};

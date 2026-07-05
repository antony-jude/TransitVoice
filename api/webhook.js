const { TelegramBot } = require('node-telegram-bot-api');
const initBot = require('../bot');

const TOKEN = process.env.BOT_TOKEN;

// Initialize TelegramBot in webhook mode (without active polling)
const bot = new TelegramBot(TOKEN, { webHook: true });
initBot(bot);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      // Process incoming Telegram update object from request body
      await bot.processUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(200).send('TransitVoice Bot Webhook Endpoint');
  }
};

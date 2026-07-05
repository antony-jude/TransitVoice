const { TelegramBot } = require('node-telegram-bot-api');
const initBot = require('../bot');

const TOKEN = process.env.BOT_TOKEN;

// Initialize TelegramBot without polling or internal webHook server (passive mode for serverless)
const bot = new TelegramBot(TOKEN);
initBot(bot);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    // Intercept outbound bot API requests to collect their promises
    const promises = [];
    
    const originalSendMessage = bot.sendMessage.bind(bot);
    bot.sendMessage = (...args) => {
      const p = originalSendMessage(...args);
      promises.push(p);
      return p;
    };

    const originalAnswerCallback = bot.answerCallbackQuery.bind(bot);
    bot.answerCallbackQuery = (...args) => {
      const p = originalAnswerCallback(...args);
      promises.push(p);
      return p;
    };

    try {
      // Process incoming Telegram update object from request body
      await bot.processUpdate(req.body);

      // Yield control to the event loop to let listeners run and push promises
      await new Promise(resolve => setImmediate(resolve));

      // Wait for all outbound Telegram API requests to complete before closing the serverless function
      await Promise.all(promises);

      res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(200).send('TransitVoice Bot Webhook Endpoint');
  }
};

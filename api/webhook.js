const { TelegramBot } = require('node-telegram-bot-api');
const initBot = require('../bot');

const TOKEN = process.env.BOT_TOKEN;

// Initialize TelegramBot without polling or internal webHook server (passive mode for serverless)
const bot = new TelegramBot(TOKEN);

// Wrap listener registration to track their async execution promises globally
const listenerPromises = [];

const originalOn = bot.on.bind(bot);
bot.on = (event, listener) => {
  return originalOn(event, (...args) => {
    try {
      const p = listener(...args);
      if (p && typeof p.then === 'function') {
        listenerPromises.push(p.catch(err => console.error(`Listener error (${event}):`, err)));
      }
    } catch (err) {
      console.error(`Listener sync error (${event}):`, err);
    }
  });
};

const originalOnText = bot.onText.bind(bot);
bot.onText = (regexp, listener) => {
  return originalOnText(regexp, (...args) => {
    try {
      const p = listener(...args);
      if (p && typeof p.then === 'function') {
        listenerPromises.push(p.catch(err => console.error(`Listener error (onText):`, err)));
      }
    } catch (err) {
      console.error(`Listener sync error (onText):`, err);
    }
  });
};

// Initialize the bot listeners
initBot(bot);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    // Clear promises list for this request lifecycle
    listenerPromises.length = 0;
    
    // Intercept outbound bot API requests to collect their promises
    const apiPromises = [];
    
    const originalSendMessage = bot.sendMessage.bind(bot);
    bot.sendMessage = (...args) => {
      const p = originalSendMessage(...args);
      apiPromises.push(p.catch(err => console.error('sendMessage error:', err)));
      return p;
    };

    const originalAnswerCallback = bot.answerCallbackQuery.bind(bot);
    bot.answerCallbackQuery = (...args) => {
      const p = originalAnswerCallback(...args);
      apiPromises.push(p.catch(err => console.error('answerCallbackQuery error:', err)));
      return p;
    };

    try {
      // Process incoming Telegram update object from request body
      await bot.processUpdate(req.body);

      // Yield control to the event loop to let listener wrappers run and push promises
      await new Promise(resolve => setImmediate(resolve));

      // Wait for all listeners (and their async DB operations) to complete
      await Promise.all(listenerPromises);

      // Wait for all outbound Telegram API requests to complete before closing the serverless function
      await Promise.all(apiPromises);

      res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(200).send('TransitVoice Bot Webhook Endpoint');
  }
};

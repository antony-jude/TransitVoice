// Local entry point for TransitVoice bot and dashboard
const { TelegramBot } = require('node-telegram-bot-api');
const initBot = require('./bot');
const startDashboard = require('./dashboard');

// ---- CONFIG ----
const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
  console.error('Error: BOT_TOKEN environment variable is not defined!');
  process.exit(1);
}

// Start Telegram bot in polling mode for local development
const bot = new TelegramBot(TOKEN, { polling: true });
initBot(bot);

console.log('TransitVoice bot is running locally with polling... (Ctrl+C to stop)');

// Start local dashboard web server
startDashboard();

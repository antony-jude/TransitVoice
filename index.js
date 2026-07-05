// TransitVoice — Telegram Bot Prototype
// Reports transit issues via guided chat flow, logs to reports.json

const { TelegramBot } = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// ---- CONFIG ----
const TOKEN = process.env.BOT_TOKEN || 'PASTE_YOUR_TOKEN_HERE';
const DATA_FILE = path.join(__dirname, 'reports.json');

const bot = new TelegramBot(TOKEN, { polling: true });

// In-memory conversation state, keyed by chat id
// { step: 'category' | 'route' | 'details' | 'done', category, route, details }
const sessions = {};

const CATEGORIES = [
  { text: '🚌 Overcrowding', value: 'overcrowding' },
  { text: '⚠️ Rash driving', value: 'rash_driving' },
  { text: '⏱️ Delay', value: 'delay' },
  { text: '🚨 Harassment', value: 'harassment' },
  { text: '❓ Other', value: 'other' },
];

// ---- HELPERS ----

function loadReports() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveReport(report) {
  const reports = loadReports();
  reports.push(report);
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
  return reports.length; // acts as a simple reference number
}

function categoryKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: CATEGORIES.map((c) => [
        { text: c.text, callback_data: c.value },
      ]),
    },
  };
}

// ---- BOT FLOW ----

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: 'category' };
  bot.sendMessage(
    chatId,
    "Hi! I'm TransitVoice 🚍\nReport an MTC bus issue in under 30 seconds.\n\nWhat happened?",
    categoryKeyboard()
  );
});

// Handle category button press
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const session = sessions[chatId];

  if (!session || session.step !== 'category') return;

  const chosen = CATEGORIES.find((c) => c.value === query.data);
  session.category = chosen ? chosen.value : 'other';
  session.step = 'route';

  bot.answerCallbackQuery(query.id);
  bot.sendMessage(
    chatId,
    `Got it: *${chosen.text}*\n\nWhich route or bus number was it? (type "not sure" if unknown)`,
    { parse_mode: 'Markdown' }
  );
});

// Handle text replies (route, then details)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const session = sessions[chatId];
  const text = msg.text;

  if (!session || !text || text.startsWith('/')) return;

  if (session.step === 'route') {
    session.route = text;
    session.step = 'details';
    bot.sendMessage(chatId, 'Anything else to add? (or type "no")');
    return;
  }

  if (session.step === 'details') {
    session.details = text;
    session.step = 'done';

    const report = {
      chatId,
      username: msg.from.username || msg.from.first_name || 'anonymous',
      category: session.category,
      route: session.route,
      details: session.details,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    const refNumber = saveReport(report);

    let reply = `✅ Thanks! Your report has been logged.\nReference #${refNumber}`;

    // Urgency flag for harassment reports
    if (session.category === 'harassment') {
      reply +=
        '\n\n⚠️ If you are in immediate danger, please contact the Women Helpline: 181 (India, toll-free).';
    }

    bot.sendMessage(chatId, reply);

    // Reset session so they can report again
    delete sessions[chatId];
    return;
  }
});

console.log('TransitVoice bot is running... (Ctrl+C to stop)');

// Start the dashboard web server
const startDashboard = require('./dashboard');
startDashboard(DATA_FILE);

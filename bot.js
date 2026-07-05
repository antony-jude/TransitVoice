const { saveReport, getSession, saveSession, deleteSession } = require('./db');

const CATEGORIES = [
  { text: '🚌 Overcrowding', value: 'overcrowding' },
  { text: '⚠️ Rash driving', value: 'rash_driving' },
  { text: '⏱️ Delay', value: 'delay' },
  { text: '🚨 Harassment', value: 'harassment' },
  { text: '❓ Other', value: 'other' },
];

function categoryKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: CATEGORIES.map((c) => [
        { text: c.text, callback_data: c.value },
      ]),
    },
  };
}

module.exports = function initBot(bot) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await saveSession(chatId, { step: 'category' });
    bot.sendMessage(
      chatId,
      "Hi! I'm TransitVoice 🚍\nReport an MTC bus issue in under 30 seconds.\n\nWhat happened?",
      categoryKeyboard()
    );
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const session = await getSession(chatId);

    if (!session || session.step !== 'category') return;

    const chosen = CATEGORIES.find((c) => c.value === query.data);
    session.category = chosen ? chosen.value : 'other';
    session.step = 'route';

    await saveSession(chatId, session);
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(
      chatId,
      `Got it: *${chosen.text}*\n\nWhich route or bus number was it? (type "not sure" if unknown)`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const session = await getSession(chatId);
    const text = msg.text;

    if (!session || !text || text.startsWith('/')) return;

    if (session.step === 'route') {
      session.route = text;
      session.step = 'details';
      await saveSession(chatId, session);
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

      const refNumber = await saveReport(report);
      let reply = `✅ Thanks! Your report has been logged.\nReference #${refNumber}`;

      if (session.category === 'harassment') {
        reply += '\n\n⚠️ If you are in immediate danger, please contact the Women Helpline: 181 (India, toll-free).';
      }

      bot.sendMessage(chatId, reply);
      await deleteSession(chatId);
      return;
    }
  });
};

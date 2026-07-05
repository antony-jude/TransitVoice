# 🚍 TransitVoice — MTC Issue Reports Bot & Dashboard

**Live Web Dashboard:** [https://transit-voice.vercel.app/](https://transit-voice.vercel.app/)

TransitVoice is a dual-system prototype designed to report transit issues (e.g. overcrowding, delays, safety concerns) in under 30 seconds. It consists of an interactive **Telegram Bot** and a real-time **Sky Blue Web Dashboard** built with modern aesthetics.

Restructured to deploy on **Vercel** as serverless functions backed by **Vercel KV**, with seamless support for local development.

---

## ✨ Features

- **🤖 Telegram Bot**:
  - Guided conversational flow using custom button keyboards.
  - Reports overcrowding, rash driving, delays, harassment, and more.
  - Automatically flags harassment reports with immediate helpline resource guidance.
- **📊 Real-time Dashboard**:
  - Sleek, modern **Sky Blue & White** card-based theme (inspired by the MTC bus logo).
  - Real-time KPI summaries (Total, Pending, Resolved, and Harassment counts).
  - Search reports by keywords, filter by category/status, and toggle 10-second auto-refresh.
  - Interactive "Resolve" button with micro-animations to instantly update status in database.

---

## 🛠️ Technology Stack

- **Core**: Node.js & Express
- **Bot Engine**: `node-telegram-bot-api`
- **Database**: Vercel KV (Redis) on production, falling back to local `reports.json` for development.
- **Frontend**: Vanilla HTML5, CSS3 Variables, responsive layout, and Lucide Icons.

---

## 📂 Project Structure

```text
├── api/
│   ├── reports/
│   │   ├── index.js      # Serverless route: GET /api/reports
│   │   └── resolve.js    # Serverless route: POST /api/reports/resolve
│   └── webhook.js        # Serverless route: Telegram webhook receiver
├── index.html            # Dashboard frontend UI
├── index.js              # Local development entry point
├── bot.js                # Shared bot command handlers
├── db.js                 # Unified database wrapper (KV / reports.json)
├── dashboard.js          # Local express web server configuration
├── vercel.json           # Vercel serverless routing configuration
└── package.json          # Node dependencies
```

---

## 💻 Local Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run the App
Launch the Telegram bot in polling mode and start the local express dashboard (Default port `3000`):
```powershell
$env:BOT_TOKEN="YOUR_BOT_TOKEN"; node index.js
```
Open **`http://localhost:3000`** in your browser to view the dashboard.

---

## 🚀 Vercel Production Deployment

### Vercel Root Directory Path: `./` (Default Root)
Leave the **Root Directory** setting on Vercel blank or set to `./`. Vercel automatically detects `vercel.json` and builds the serverless endpoints from the repository root.

### 1. Push to GitHub
Upload your code to your repository:
```bash
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to **Vercel**, import your `TransitVoice` repository.
2. In **Environment Variables**, add:
   - `BOT_TOKEN`: Your Telegram Bot Token.
3. Click **Deploy**.

### 3. Attach a Database (Upstash Redis)
Since Vercel has replaced its native "KV" option with Marketplace integrations, you should connect **Upstash Redis**:
1. Go to your Vercel project dashboard, click the **Integrations** tab (or visit the [Vercel Marketplace](https://vercel.com/integrations)).
2. Search for **Upstash Redis** and click **Add Integration** / **Connect**.
3. Follow the prompts to create or link an Upstash Redis database. Once linked, Vercel will automatically inject the database secrets (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) into your project variables!

### 4. Hook up the Webhook
Instruct Telegram to send new messages directly to your Vercel deployment (replace `<YOUR_BOT_TOKEN>` with your token, and `<YOUR_VERCEL_DOMAIN>` with your live URL, e.g. `transit-voice.vercel.app`):
```text
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_DOMAIN>/api/webhook
```
*(Once Telegram returns `{"ok":true,"result":true,"description":"Webhook was set"}` in your browser, the bot is officially connected).*

---

## ⚡ How the Bot Runs 24/7 (Free & Serverless)

Instead of running a continuous background node process (which is expensive and difficult to keep running 24/7), this project runs **100% serverlessly** on Vercel:

1. **On-Demand Webhooks**: When a user sends a message to the bot on Telegram, Telegram immediately triggers an HTTP POST request to your Vercel webhook endpoint (`/api/webhook`).
2. **Instant Wakeup**: Vercel spins up a Serverless Function, passes the update to `bot.js`, processes the conversation step, updates state/database, and responds to the user.
3. **Automatic Shut Down**: The function shuts down immediately after replying, consuming resources only when active.

This makes your Telegram bot **100% stable, active 24/7, and free** without needing a persistent host!

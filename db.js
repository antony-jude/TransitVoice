const fs = require('fs');
const path = require('path');

let kv = null;
const sessions = {}; // in-memory session fallback for local

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (url && token) {
  try {
    const { createClient } = require('@vercel/kv');
    kv = createClient({ url, token });
  } catch (err) {
    console.warn('Failed to initialize Vercel KV client:', err);
  }
}

const DATA_FILE = path.join(__dirname, 'reports.json');
const isVercel = !!process.env.VERCEL;

async function loadReports() {
  if (kv) {
    try {
      const reports = await kv.get('reports');
      return reports ? (typeof reports === 'string' ? JSON.parse(reports) : reports) : [];
    } catch (err) {
      console.error('KV get reports error, falling back to local file:', err);
    }
  }
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]');
  } catch (err) {
    return [];
  }
}

async function saveReport(report) {
  const reports = await loadReports();
  reports.push(report);
  if (kv) {
    try {
      await kv.set('reports', JSON.stringify(reports));
    } catch (err) {
      console.error('KV set reports error:', err);
      if (!isVercel) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
      }
    }
  } else {
    if (!isVercel) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
    } else {
      console.error('Error: KV is not configured on Vercel. Cannot save report.');
    }
  }
  return reports.length;
}

async function resolveReport(timestamp) {
  const reports = await loadReports();
  const report = reports.find(r => r.timestamp === timestamp);
  if (report) {
    report.status = 'resolved';
    if (kv) {
      try {
        await kv.set('reports', JSON.stringify(reports));
      } catch (err) {
        console.error('KV set reports error on resolve:', err);
        if (!isVercel) {
          fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
        }
      }
    } else {
      if (!isVercel) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
      } else {
        console.error('Error: KV is not configured on Vercel. Cannot resolve report.');
      }
    }
    return { success: true, report };
  }
  return { success: false };
}

// Session store for serverless compatibility
async function getSession(chatId) {
  if (kv) {
    try {
      const session = await kv.get(`session:${chatId}`);
      return session ? (typeof session === 'string' ? JSON.parse(session) : session) : null;
    } catch (err) {
      console.error('KV get session error:', err);
    }
  }
  return sessions[chatId] || null;
}

async function saveSession(chatId, session) {
  if (kv) {
    try {
      await kv.set(`session:${chatId}`, JSON.stringify(session), { ex: 3600 }); // 1 hour expiry
      return;
    } catch (err) {
      console.error('KV set session error:', err);
    }
  }
  sessions[chatId] = session;
}

async function deleteSession(chatId) {
  if (kv) {
    try {
      await kv.del(`session:${chatId}`);
      return;
    } catch (err) {
      console.error('KV del session error:', err);
    }
  }
  delete sessions[chatId];
}

module.exports = {
  loadReports,
  saveReport,
  resolveReport,
  getSession,
  saveSession,
  deleteSession
};

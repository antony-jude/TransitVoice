const fs = require('fs');
const path = require('path');

const sessions = {}; // in-memory session fallback for local
const DATA_FILE = path.join(__dirname, 'reports.json');
const isVercel = !!process.env.VERCEL;

// Redis client getter to handle connection management
async function getRedisClient() {
  if (process.env.REDIS_URL) {
    const { createClient } = require('redis');
    const client = createClient({ 
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: false,
        connectTimeout: 3000
      }
    });
    await client.connect();
    return client;
  }
  return null;
}

async function loadReports() {
  if (process.env.REDIS_URL) {
    let client = null;
    try {
      client = await getRedisClient();
      const reports = await client.get('reports');
      await client.disconnect();
      return reports ? JSON.parse(reports) : [];
    } catch (err) {
      console.error('Redis get reports error, falling back to local file:', err);
      if (client) {
        try { await client.disconnect(); } catch (e) {}
      }
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
  if (process.env.REDIS_URL) {
    let client = null;
    try {
      client = await getRedisClient();
      await client.set('reports', JSON.stringify(reports));
      await client.disconnect();
    } catch (err) {
      console.error('Redis set reports error:', err);
      if (client) {
        try { await client.disconnect(); } catch (e) {}
      }
      if (!isVercel) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
      }
    }
  } else {
    if (!isVercel) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
    } else {
      console.error('Error: Redis is not configured on Vercel. Cannot save report.');
    }
  }
  return reports.length;
}

async function resolveReport(timestamp) {
  const reports = await loadReports();
  const report = reports.find(r => r.timestamp === timestamp);
  if (report) {
    report.status = 'resolved';
    if (process.env.REDIS_URL) {
      let client = null;
      try {
        client = await getRedisClient();
        await client.set('reports', JSON.stringify(reports));
        await client.disconnect();
      } catch (err) {
        console.error('Redis set reports error on resolve:', err);
        if (client) {
          try { await client.disconnect(); } catch (e) {}
        }
        if (!isVercel) {
          fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
        }
      }
    } else {
      if (!isVercel) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
      } else {
        console.error('Error: Redis is not configured on Vercel. Cannot resolve report.');
      }
    }
    return { success: true, report };
  }
  return { success: false };
}

// Session store for serverless compatibility
async function getSession(chatId) {
  if (process.env.REDIS_URL) {
    let client = null;
    try {
      client = await getRedisClient();
      const session = await client.get(`session:${chatId}`);
      await client.disconnect();
      return session ? JSON.parse(session) : null;
    } catch (err) {
      console.error('Redis get session error:', err);
      if (client) {
        try { await client.disconnect(); } catch (e) {}
      }
    }
  }
  return sessions[chatId] || null;
}

async function saveSession(chatId, session) {
  if (process.env.REDIS_URL) {
    let client = null;
    try {
      client = await getRedisClient();
      await client.set(`session:${chatId}`, JSON.stringify(session), { EX: 3600 }); // 1 hour expiry
      await client.disconnect();
      return;
    } catch (err) {
      console.error('Redis set session error:', err);
      if (client) {
        try { await client.disconnect(); } catch (e) {}
      }
    }
  }
  sessions[chatId] = session;
}

async function deleteSession(chatId) {
  if (process.env.REDIS_URL) {
    let client = null;
    try {
      client = await getRedisClient();
      await client.del(`session:${chatId}`);
      await client.disconnect();
      return;
    } catch (err) {
      console.error('Redis del session error:', err);
      if (client) {
        try { await client.disconnect(); } catch (e) {}
      }
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

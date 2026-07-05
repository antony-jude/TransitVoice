const express = require('express');
const path = require('path');
const { loadReports, resolveReport } = require('./db');

module.exports = function startDashboard() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Serve index.html on root
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  // Get reports API
  app.get('/api/reports', async (req, res) => {
    try {
      const reports = await loadReports();
      // Map to ensure status field exists
      const mapped = reports.map((r, index) => ({
        id: index + 1, // 1-based ID matching reference number
        status: 'pending', // default status
        ...r
      }));
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load reports' });
    }
  });

  // Resolve report API
  app.post('/api/reports/resolve', async (req, res) => {
    const { timestamp } = req.body;
    if (!timestamp) return res.status(400).json({ error: 'Missing timestamp' });

    try {
      const result = await resolveReport(timestamp);
      if (result.success) {
        return res.json({ success: true, report: result.report });
      }
      res.status(404).json({ error: 'Report not found' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update report' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Dashboard is available at http://localhost:${PORT}`);
  });
};

const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = function startDashboard(reportsFilePath) {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Serve dashboard.html on root
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  });

  // Get reports API
  app.get('/api/reports', (req, res) => {
    try {
      if (!fs.existsSync(reportsFilePath)) {
        return res.json([]);
      }
      const raw = fs.readFileSync(reportsFilePath, 'utf8');
      const reports = JSON.parse(raw || '[]');
      
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
  app.post('/api/reports/resolve', (req, res) => {
    const { timestamp } = req.body;
    if (!timestamp) return res.status(400).json({ error: 'Missing timestamp' });

    try {
      if (!fs.existsSync(reportsFilePath)) {
        return res.status(404).json({ error: 'No reports found' });
      }
      const raw = fs.readFileSync(reportsFilePath, 'utf8');
      const reports = JSON.parse(raw || '[]');
      
      const report = reports.find(r => r.timestamp === timestamp);
      if (report) {
        report.status = 'resolved';
        fs.writeFileSync(reportsFilePath, JSON.stringify(reports, null, 2));
        return res.json({ success: true, report });
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

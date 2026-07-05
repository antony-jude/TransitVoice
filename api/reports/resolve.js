const { resolveReport } = require('../../db');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { timestamp } = req.body;
    if (!timestamp) {
      return res.status(400).json({ error: 'Missing timestamp' });
    }

    try {
      const result = await resolveReport(timestamp);
      if (result.success) {
        return res.status(200).json({ success: true, report: result.report });
      }
      res.status(404).json({ error: 'Report not found' });
    } catch (err) {
      console.error('Error in POST /api/reports/resolve serverless handler:', err);
      res.status(500).json({ error: 'Failed to resolve report' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};

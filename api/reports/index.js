const { loadReports } = require('../../db');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const reports = await loadReports();
      // Ensure all reports have an ID and a default status field
      const mapped = reports.map((r, index) => ({
        id: index + 1,
        status: 'pending',
        ...r
      }));
      res.status(200).json(mapped);
    } catch (err) {
      console.error('Error in GET /api/reports serverless handler:', err);
      res.status(500).json({ error: 'Failed to load reports' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};

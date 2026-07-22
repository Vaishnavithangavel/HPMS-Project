const { query } = require('../db/db');

// Get all audit logs (Admin only)
async function getAuditLogs(req, res) {
  try {
    const { action = '', limit = 100 } = req.query;
    
    let sql = `
      SELECT al.*, u.username, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      sql += ' AND al.action = ?';
      params.push(action);
    }

    sql += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const logs = await query(sql, params);
    res.status(200).json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Internal server error retrieving audit logs' });
  }
}

module.exports = {
  getAuditLogs,
};

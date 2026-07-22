const { query } = require('../db/db');

/**
 * Logs a security or operational event to the database.
 * @param {number|null} userId - The user ID who performed the action.
 * @param {string} action - Action identifier (e.g. USER_LOGIN, RECORD_VIEW).
 * @param {string} details - Detailed text description of the event.
 * @param {string} ipAddress - Client's IP address.
 */
async function logAudit(userId, action, details, ipAddress = '127.0.0.1') {
  try {
    const sql = `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`;
    await query(sql, [userId, action, details, ipAddress]);
  } catch (error) {
    console.error(`FAILED TO WRITE AUDIT LOG: ${error.message}. Event: ${action} by User ${userId}`);
  }
}

module.exports = logAudit;

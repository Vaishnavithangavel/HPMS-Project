const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || process.env.MYSQL_ADDON_HOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQL_ADDON_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_ADDON_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_ADDON_PORT || '3306'),
  database: process.env.DB_NAME || process.env.MYSQL_ADDON_DB || 'hpms_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;

try {
  pool = mysql.createPool(config);
  console.log(`Database pool created for host: ${config.host}:${config.port}, DB: ${config.database}`);
} catch (error) {
  console.error('Failed to initialize database pool:', error.message);
}

// Helper query function
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error(`Database query error: ${error.message}\nSQL: ${sql}\nParams:`, params);
    throw error;
  }
}

// Export raw pool and query helper
module.exports = {
  pool,
  query,
};

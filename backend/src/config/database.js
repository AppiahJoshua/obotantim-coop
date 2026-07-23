const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse and sanitize the DATABASE_URL to remove invalid parameters like ssl-mode
const rawUrl = process.env.DATABASE_URL || '';
let connectionConfig = rawUrl;
let sslConfig = undefined;

if (rawUrl) {
  try {
    const dbUrl = new URL(rawUrl);
    
    // Extract ssl-mode settings if present
    const sslMode = dbUrl.searchParams.get('ssl-mode') || dbUrl.searchParams.get('sslmode');
    
    // Delete them from the URL query string so mysql2 doesn't see them
    dbUrl.searchParams.delete('ssl-mode');
    dbUrl.searchParams.delete('sslmode');

    if (sslMode && sslMode.toUpperCase() !== 'DISABLED') {
      sslConfig = {
        rejectUnauthorized: sslMode.toUpperCase() === 'VERIFY_CA' || sslMode.toUpperCase() === 'VERIFY_IDENTITY'
      };
    }

    connectionConfig = dbUrl.toString();
  } catch (e) {
    // Fallback if URL parsing fails for any reason
    console.warn('⚠️ Could not parse DATABASE_URL via URL parser, using raw string.');
  }
}

const pool = mysql.createPool({
  uri: connectionConfig,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

// Test connection on startup
pool.getConnection()
  .then((conn) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ MySQL database connected');
    }
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL connection error:', err.message);
  });

module.exports = pool;

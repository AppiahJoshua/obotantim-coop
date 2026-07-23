const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse the DATABASE_URL to safely handle query parameters like ssl-mode
const dbUrl = new URL(process.env.DATABASE_URL);

// Extract ssl-mode from query params if present and map it to mysql2's expected 'ssl' property
const sslMode = dbUrl.searchParams.get('ssl-mode') || dbUrl.searchParams.get('sslmode');
dbUrl.searchParams.delete('ssl-mode');
dbUrl.searchParams.delete('sslmode');

let sslConfig = undefined;
if (sslMode && sslMode.toUpperCase() !== 'DISABLED') {
  sslConfig = {
    rejectUnauthorized: sslMode.toUpperCase() === 'VERIFY_CA' || sslMode.toUpperCase() === 'VERIFY_IDENTITY'
  };
}

const pool = mysql.createPool({
  uri: dbUrl.toString(),
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

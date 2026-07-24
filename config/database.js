const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const rawUrl = process.env.DATABASE_URL || '';
let poolConfig = {};

if (rawUrl) {
  try {
    const dbUrl = new URL(rawUrl);
    poolConfig = {
      host: dbUrl.hostname,
      port: dbUrl.port ? parseInt(dbUrl.port, 10) : 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.replace(/^\//, ''),
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    };
  } catch (error) {
    console.warn('⚠️ Could not parse DATABASE_URL; continuing without a startup connection config.');
  }
} else {
  console.warn('⚠️ DATABASE_URL is not set. The app will still boot, but database-backed routes will fail until the environment is configured.');
}

const pool = mysql.createPool({
  ...poolConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

// Test connection on startup only when a URL is present
if (rawUrl) {
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
}

module.exports = pool;

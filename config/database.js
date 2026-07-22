const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
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
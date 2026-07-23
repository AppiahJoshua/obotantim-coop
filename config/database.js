const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse the connection URL to configure options cleanly
const dbUrl = new URL(process.env.DATABASE_URL);

const pool = mysql.createPool({
  host: dbUrl.hostname,
  port: dbUrl.port || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.replace('/', ''),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  // Standardize SSL for hosted MySQL/MariaDB instances (Render/Aiven/PlanetScale)
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
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

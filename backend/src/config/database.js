const mysql = require('mysql2/promise');
require('dotenv').config();

const rawUrl = process.env.DATABASE_URL || '';
let poolConfig = {};

if (rawUrl) {
  try {
    const dbUrl = new URL(rawUrl);

    // Extract SSL preferences if provided in query params
    const sslMode = dbUrl.searchParams.get('ssl-mode') || dbUrl.searchParams.get('sslmode');

    // Strip out all SSL-related query params so mysql2 doesn't throw invalid option warnings
    dbUrl.searchParams.delete('ssl-mode');
    dbUrl.searchParams.delete('sslmode');
    dbUrl.searchParams.delete('ssl');

    // Base connection configuration parsed from URL
    poolConfig = {
      host: dbUrl.hostname,
      port: dbUrl.port ? parseInt(dbUrl.port, 10) : 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.replace(/^\//, ''),
    };

    // Configure SSL properly without passing raw query strings to mysql2
    if (sslMode && sslMode.toUpperCase() !== 'DISABLED') {
      poolConfig.ssl = {
        rejectUnauthorized: sslMode.toUpperCase() === 'VERIFY_CA' || sslMode.toUpperCase() === 'VERIFY_IDENTITY',
      };
    } else if (process.env.NODE_ENV === 'production') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  } catch (e) {
    console.warn('⚠️ Could not parse DATABASE_URL via URL parser, falling back to raw URI.');
    poolConfig = { uri: rawUrl };
  }
}

const pool = mysql.createPool({
  ...poolConfig,
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

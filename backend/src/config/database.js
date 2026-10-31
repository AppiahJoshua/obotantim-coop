const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  timezone: 'Z',
  ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
});

const missingConfig = ['MYSQL_USER', 'MYSQL_DATABASE'].filter((key) => !process.env[key]);

pool.query = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params.map((value) => value === undefined ? null : value));
  const isRows = Array.isArray(result);
  return {
    rows: isRows ? result : [],
    rowCount: isRows ? result.length : result.affectedRows,
    insertId: isRows ? undefined : result.insertId,
  };
};

if (missingConfig.length) {
  console.error(`❌ MySQL configuration missing: ${missingConfig.join(', ')}. Set these in backend/.env.`);
} else {
  pool.getConnection()
    .then((connection) => {
      if (process.env.NODE_ENV !== 'production') console.log('✅ MySQL database connected');
      connection.release();
    })
    .catch((error) => console.error(
      `❌ MySQL connection error (${error.code || 'UNKNOWN'}): ${error.message || String(error)}`
    ));
}

module.exports = pool;
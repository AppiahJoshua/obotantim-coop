const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
  let connection;
  try {
    const missingConfig = ['MYSQL_USER', 'MYSQL_DATABASE'].filter((key) => !process.env[key]);
    if (missingConfig.length) throw new Error(`Missing ${missingConfig.join(', ')} in backend/.env.`);

    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    for (const [column, definition] of [
      ['reset_token_hash', 'VARCHAR(255) NULL'],
      ['reset_token_expires_at', 'DATETIME NULL'],
    ]) {
      const [existing] = await connection.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = ?`,
        [column]
      );
      if (!existing.length) {
        await connection.query(`ALTER TABLE admin_users ADD COLUMN ${column} ${definition}`);
      }
    }
    console.log('Admin password reset columns are ready.');
  } catch (error) {
    console.error(`Password reset migration failed (${error.code || 'ERROR'}): ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
  let connection;
  try {
    const missing = ['MYSQL_USER', 'MYSQL_DATABASE'].filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`Missing ${missing.join(', ')} in backend/.env.`);

    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users'
         AND COLUMN_NAME = 'disabled_modules'`
    );

    if (!columns.length) {
      await connection.query('ALTER TABLE admin_users ADD COLUMN disabled_modules JSON NULL AFTER token_version');
      console.log('Module access override column added to admin_users.');
    } else {
      console.log('Module access override column already exists.');
    }
  } catch (error) {
    console.error(`Module access migration failed (${error.code || 'ERROR'}): ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
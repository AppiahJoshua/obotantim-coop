const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

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
    });

    for (const [column, definition] of [
      ['mfa_secret', 'VARCHAR(255) NULL'],
      ['mfa_enabled', 'BOOLEAN NOT NULL DEFAULT FALSE'],
      ['token_version', 'INT NOT NULL DEFAULT 0'],
    ]) {
      if (!await columnExists(connection, 'admin_users', column)) {
        await connection.query(`ALTER TABLE admin_users ADD COLUMN ${column} ${definition}`);
      }
    }

    if (!await columnExists(connection, 'registrations', 'tracking_code')) {
      await connection.query('ALTER TABLE registrations ADD COLUMN tracking_code CHAR(32) NULL');
    }
    await connection.query(
      `UPDATE registrations SET tracking_code = REPLACE(UUID(), '-', '')
       WHERE tracking_code IS NULL OR tracking_code = ''`
    );
    const [trackingIndexes] = await connection.execute(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'registrations'
         AND INDEX_NAME = 'uq_registrations_tracking_code'`
    );
    if (!trackingIndexes.length) {
      await connection.query('ALTER TABLE registrations ADD UNIQUE KEY uq_registrations_tracking_code (tracking_code)');
    }
    await connection.query('ALTER TABLE registrations MODIFY tracking_code CHAR(32) NOT NULL');

    await connection.query(`CREATE TABLE IF NOT EXISTS sms_outbox (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      phone_number VARCHAR(25) NOT NULL,
      message VARCHAR(1000) NOT NULL,
      status ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_error TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME NULL,
      KEY idx_sms_outbox_ready (status, next_attempt_at, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    console.log('MFA, token revocation, tracking codes, and SMS outbox schema are ready.');
  } catch (error) {
    console.error(`Security migration failed (${error.code || 'ERROR'}): ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
  let connection;
  try {
    const missingConfig = ['MYSQL_USER', 'MYSQL_DATABASE'].filter((key) => !process.env[key]);
    if (missingConfig.length) {
      throw new Error(`Missing ${missingConfig.join(', ')}. Configure backend/.env first.`);
    }

    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true,
      ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    const migrationsDirectory = path.join(__dirname, 'migrations');
    await connection.query(fs.readFileSync(path.join(migrationsDirectory, '001_notifications_outbox.sql'), 'utf8'));

    for (const [column, definition] of [
      ['recipient_user_id', 'INT NULL'],
      ['event_type', 'VARCHAR(80) NULL'],
    ]) {
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_outbox' AND COLUMN_NAME = ?`,
        [column]
      );
      if (!columns.length) {
        await connection.query(`ALTER TABLE email_outbox ADD COLUMN ${column} ${definition}`);
      }
    }
    const [foreignKeys] = await connection.execute(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_outbox'
         AND CONSTRAINT_NAME = 'fk_email_outbox_user'`
    );
    if (!foreignKeys.length) {
      await connection.query(
        `ALTER TABLE email_outbox ADD CONSTRAINT fk_email_outbox_user
         FOREIGN KEY (recipient_user_id) REFERENCES admin_users(id) ON DELETE SET NULL`
      );
    }

    await connection.query(fs.readFileSync(path.join(migrationsDirectory, '002_settings.sql'), 'utf8'));
    console.log('Notification preferences, email outbox metadata, and settings tables are ready.');
  } catch (error) {
    console.error(`Notifications migration failed (${error.code || 'ERROR'}): ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();

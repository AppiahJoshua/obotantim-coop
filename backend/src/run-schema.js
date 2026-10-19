const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runSchema() {
  let database;
  try {
    const missingConfig = ['MYSQL_USER', 'MYSQL_DATABASE'].filter((key) => !process.env[key]);
    if (missingConfig.length) {
      throw new Error(`Missing ${missingConfig.join(', ')}. Configure backend/.env first.`);
    }

    database = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true,
      ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔄 Executing MySQL database schema...');
    await database.query(sql);
    console.log('✅ Database schema and seed data successfully executed!');
  } catch (err) {
    console.error(`❌ Error executing schema (${err.code || 'CONFIG_OR_DATABASE_ERROR'}): ${err.message || String(err)}`);
    process.exitCode = 1;
  } finally {
    if (database) await database.end();
  }
}

runSchema();
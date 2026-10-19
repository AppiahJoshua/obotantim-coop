const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const rawUrl = process.env.DATABASE_URL || 'postgres://avnadmin:AVNS_sn4xcV6EoXpU3KYY8ir@pg-121e710e-joeappalu-1b1b.a.aivencloud.com:28376/defaultdb?sslmode=require'; // Fallback to your Aiven PostgreSQL URL[cite: 1]

const pool = new Pool({
  connectionString: rawUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ PostgreSQL database connected successfully');
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection error:', err.message);
  });

module.exports = pool;

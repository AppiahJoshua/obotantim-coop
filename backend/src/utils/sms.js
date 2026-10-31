const pool = require('../config/database');

const enqueueSms = async (phoneNumber, message) => {
  const normalized = String(phoneNumber || '').replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{9,15}$/.test(normalized)) return;
  await pool.query(
    'INSERT INTO sms_outbox (phone_number, message) VALUES (?, ?)',
    [normalized, message.slice(0, 1000)]
  );
};

const safelyEnqueueSms = async (phoneNumber, message) => {
  try { await enqueueSms(phoneNumber, message); }
  catch (error) { console.error('SMS enqueue failed:', error.message); }
};

module.exports = { enqueueSms, safelyEnqueueSms };

const pool = require('../config/database');
require('dotenv').config();

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;
const POLL_INTERVAL_MS = 5000;
const endpoint = process.env.ARKESEL_SMS_URL || 'https://sms.arkesel.com/api/v2/sms/send';
const apiKey = process.env.ARKESEL_API_KEY;
const sender = process.env.ARKESEL_SENDER_ID;

if (!apiKey || !sender) {
  console.error('SMS worker requires ARKESEL_API_KEY and ARKESEL_SENDER_ID in backend/.env.');
  process.exit(1);
}

const claimBatch = async () => {
  const connection = await pool.getConnection();
  let lock = false;
  try {
    const [locks] = await connection.execute('SELECT GET_LOCK(?, 0) AS acquired', ['obotantim_sms_outbox_claim']);
    lock = Number(locks[0]?.acquired) === 1;
    if (!lock) return [];
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE sms_outbox SET status = 'PENDING', processed_at = NULL, next_attempt_at = NOW()
       WHERE status = 'PROCESSING' AND processed_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
    );
    const [jobs] = await connection.execute(
      `SELECT id, phone_number, message, attempts FROM sms_outbox
       WHERE status = 'PENDING' AND next_attempt_at <= NOW() ORDER BY id LIMIT ? FOR UPDATE`,
      [BATCH_SIZE]
    );
    if (jobs.length) {
      const ids = jobs.map((job) => job.id);
      await connection.execute(
        `UPDATE sms_outbox SET status = 'PROCESSING', attempts = attempts + 1, processed_at = NOW()
         WHERE id IN (${ids.map(() => '?').join(',')})`, ids
      );
      jobs.forEach((job) => { job.attempts += 1; });
    }
    await connection.commit();
    return jobs;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    if (lock) await connection.execute('SELECT RELEASE_LOCK(?)', ['obotantim_sms_outbox_claim']).catch(() => {});
    connection.release();
  }
};

const sendSms = async (job) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ sender, message: job.message, recipients: [job.phone_number] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`SMS gateway returned HTTP ${response.status}`);
    await pool.query("UPDATE sms_outbox SET status = 'SENT', last_error = NULL, processed_at = NOW() WHERE id = ?", [job.id]);
  } catch (error) {
    const failed = job.attempts >= MAX_ATTEMPTS;
    const delay = Math.min(3600, 30 * (2 ** Math.max(0, job.attempts - 1)));
    await pool.query(
      'UPDATE sms_outbox SET status = ?, last_error = ?, next_attempt_at = ?, processed_at = NULL WHERE id = ?',
      [failed ? 'FAILED' : 'PENDING', String(error.message || error).slice(0, 1000), new Date(Date.now() + delay * 1000), job.id]
    );
    console.error(`SMS job ${job.id} ${failed ? 'failed permanently' : 'will retry'}: ${error.message}`);
  }
};

let polling = false;
const poll = async () => {
  if (polling) return;
  polling = true;
  try {
    const jobs = await claimBatch();
    for (const job of jobs) await sendSms(job);
  } catch (error) {
    console.error('SMS outbox poll failed:', error.message);
  } finally { polling = false; }
};

poll();
setInterval(poll, POLL_INTERVAL_MS);
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });

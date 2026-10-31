const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const pool = require('../config/database');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;
const LOCK_TIMEOUT_MINUTES = 15;
const POLL_INTERVAL_MS = 5000;

const smtpPort = Number(process.env.SMTP_PORT || 587);
const from = process.env.SMTP_FROM;
const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

if (!smtpHost || !from) {
  console.error('Email worker requires SMTP_HOST and SMTP_FROM in backend/.env.');
  process.exit(1);
}

if ((smtpUser && !smtpPassword) || (!smtpUser && smtpPassword)) {
  console.error('SMTP authentication is incomplete. Set both SMTP_USER and SMTP_PASSWORD (or SMTP_PASS) in backend/.env, or leave both blank for an unauthenticated relay.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
  ...(smtpUser ? {
    auth: { user: smtpUser, pass: smtpPassword },
  } : {}),
  connectionTimeout: 15000,
  socketTimeout: 30000,
});

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const renderEmail = (job) => {
  let payload = job.payload_json;
  if (typeof payload === 'string') payload = JSON.parse(payload);
  payload = payload || {};

  if (job.template_name === 'submission_receipt') {
    const kind = payload.submissionType === 'registration' ? 'registration' : 'message';
    const title = kind === 'registration' ? 'Registration received' : 'Message received';
    const body = kind === 'registration'
      ? 'Thank you. Our cooperative team has received your registration and will contact you.'
      : 'Thank you for contacting our cooperative. Our team has received your message and will respond.';
    return {
      subject: job.subject,
      text: `Hello ${payload.name || 'there'},\n\n${body}`,
      html: `<p>Hello ${escapeHtml(payload.name || 'there')},</p><p>${body}</p>`,
    };
  }

  if (job.template_name === 'password_reset') {
    const resetUrl = String(payload.resetUrl || '');
    return {
      subject: job.subject,
      text: `A password reset was requested for your admin account. Use this link within one hour:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>A password reset was requested for your admin account.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`,
    };
  }

  const title = payload.title || job.subject;
  const body = payload.body || '';
  const actionUrl = payload.actionUrl;
  const link = actionUrl
    ? `<p><a href="${escapeHtml(new URL(actionUrl, process.env.APP_BASE_URL || 'http://localhost:5173').toString())}">Open admin dashboard</a></p>`
    : '';
  return {
    subject: job.subject,
    text: `${title}\n\n${body}${actionUrl ? `\n\n${new URL(actionUrl, process.env.APP_BASE_URL || 'http://localhost:5173')}` : ''}`,
    html: `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p>${link}`,
  };
};

const claimBatch = async () => {
  const connection = await pool.getConnection();
  let claimLockAcquired = false;
  try {
    const [lockRows] = await connection.execute(
      'SELECT GET_LOCK(?, 0) AS acquired',
      ['obotantim_email_outbox_claim']
    );
    claimLockAcquired = Number(lockRows[0]?.acquired) === 1;
    if (!claimLockAcquired) return [];

    await connection.beginTransaction();
    await connection.execute(
      `UPDATE email_outbox SET status = 'PENDING', processed_at = NULL, next_attempt_at = NOW()
       WHERE status = 'PROCESSING' AND processed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [LOCK_TIMEOUT_MINUTES]
    );
    const [jobs] = await connection.execute(
      `SELECT id, recipient_user_id, event_type, recipient_email, subject, template_name, payload_json, attempts
       FROM email_outbox
       WHERE status = 'PENDING' AND next_attempt_at <= NOW()
        ORDER BY id ASC LIMIT ? FOR UPDATE`,
      [BATCH_SIZE]
    );
    if (jobs.length) {
      const placeholders = jobs.map(() => '?').join(',');
      await connection.execute(
        `UPDATE email_outbox SET status = 'PROCESSING', attempts = attempts + 1, processed_at = NOW()
         WHERE id IN (${placeholders})`,
        jobs.map((job) => job.id)
      );
      jobs.forEach((job) => { job.attempts += 1; });
    }
    await connection.commit();
    return jobs;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    if (claimLockAcquired) {
      try {
        await connection.execute('SELECT RELEASE_LOCK(?)', ['obotantim_email_outbox_claim']);
      } catch (error) {
        console.error('Could not release email outbox claim lock:', error.message);
      }
    }
    connection.release();
  }
};

const deliver = async (job) => {
  try {
    if (job.template_name === 'password_reset') {
      let payload = job.payload_json;
      if (typeof payload === 'string') payload = JSON.parse(payload);
      const rawToken = new URL(payload.resetUrl).searchParams.get('token');
      const tokenHash = crypto.createHash('sha256').update(rawToken || '').digest('hex');
      const activeToken = await pool.query(
        `SELECT id FROM admin_users
         WHERE id = ? AND reset_token_hash = ? AND reset_token_expires_at > NOW() AND is_active = TRUE`,
        [job.recipient_user_id, tokenHash]
      );
      if (!activeToken.rows[0]) {
        await pool.query(
          `UPDATE email_outbox SET status = 'SKIPPED', payload_json = JSON_OBJECT(),
             last_error = 'Password reset token expired or was already used', processed_at = NOW()
           WHERE id = ?`,
          [job.id]
        );
        return;
      }
    }
    if (job.recipient_user_id && job.event_type) {
      const preference = await pool.query(
        'SELECT email_enabled FROM admin_notification_preferences WHERE user_id = ? AND event_type = ?',
        [job.recipient_user_id, job.event_type]
      );
      if (preference.rows[0] && !preference.rows[0].email_enabled) {
        await pool.query(
          `UPDATE email_outbox SET status = 'SKIPPED', last_error = 'Recipient email preference disabled', processed_at = NOW()
           WHERE id = ?`,
          [job.id]
        );
        return;
      }
    }
    const rendered = renderEmail(job);
    await transporter.sendMail({ from, to: job.recipient_email, ...rendered });
    await pool.query(
      `UPDATE email_outbox SET status = 'SENT',
         payload_json = IF(template_name = 'password_reset', JSON_OBJECT(), payload_json),
         last_error = NULL, processed_at = NOW() WHERE id = ?`,
      [job.id]
    );
  } catch (error) {
    const failed = job.attempts >= MAX_ATTEMPTS;
    const retryDelaySeconds = Math.min(3600, 30 * (2 ** Math.max(0, job.attempts - 1)));
    const nextAttempt = new Date(Date.now() + retryDelaySeconds * 1000);
    try {
      await pool.query(
      `UPDATE email_outbox
         SET status = ?,
           payload_json = IF(? = 'FAILED' AND template_name = 'password_reset', JSON_OBJECT(), payload_json),
           last_error = ?, next_attempt_at = ?, processed_at = NULL
       WHERE id = ?`,
        [failed ? 'FAILED' : 'PENDING', failed ? 'FAILED' : 'PENDING', String(error.message || error).slice(0, 2000), nextAttempt, job.id]
      );
    } catch (updateError) {
      console.error(`Could not persist email job ${job.id} failure:`, updateError.message);
    }
    console.error(`Email job ${job.id} ${failed ? 'failed permanently' : 'will retry'}: ${error.message}`);
  }
};

let isPolling = false;
const poll = async () => {
  if (isPolling) return;
  isPolling = true;
  try {
    const jobs = await claimBatch();
    for (const job of jobs) await deliver(job);
  } catch (error) {
    console.error('Email outbox poll failed:', error.message);
  } finally {
    isPolling = false;
  }
};

transporter.verify()
  .then(() => {
    console.log('Email outbox worker connected to SMTP.');
    poll();
    setInterval(poll, POLL_INTERVAL_MS);
  })
  .catch((error) => {
    console.error('SMTP configuration check failed:', error.message);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

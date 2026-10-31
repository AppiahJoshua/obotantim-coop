const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { backupDatabase } = require('./scripts/backupDatabase');
const pool = require('./config/database');
require('dotenv').config();

const app = express();

if (process.env.BACKUP_SCHEDULER_ENABLED === 'true') {
  const backupCron = process.env.BACKUP_CRON || '0 2 * * *';
  if (!cron.validate(backupCron)) throw new Error('BACKUP_CRON must be a valid cron expression.');
  cron.schedule(backupCron, () => backupDatabase().catch((error) => {
    console.error(JSON.stringify({ level: 'error', event: 'scheduled_backup_failed', message: error.message }));
  }));
  console.log(`Encrypted backup scheduler enabled (${backupCron}).`);
}

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// ── Security ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.set('trust proxy', 1);

// ── Rate Limiting ─────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/mfa/verify-login', authLimiter);
app.use('/api/auth/forgot-password', passwordResetRequestLimiter);

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production'
    ? (tokens, req, res) => JSON.stringify({
      timestamp: new Date().toISOString(), requestId: req.requestId,
      method: tokens.method(req, res), path: tokens.url(req, res),
      status: Number(tokens.status(req, res)), durationMs: Number(tokens['response-time'](req, res)),
      ip: req.ip,
    })
    : 'dev'));
}

// ── Routes ────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const { galleryRouter } = require('./routes/gallery');
const registrationsRoutes = require('./routes/registrations');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');
const usersProfileRoutes = require('./routes/usersProfile');
const settingsRoutes = require('./routes/settings');
const searchRoutes = require('./routes/search');
const exportsRoutes = require('./routes/exports');
const auditLogsRoutes = require('./routes/auditLogs');
const publicSettingsRoutes = require('./routes/publicSettings');
const trackingRoutes = require('./routes/tracking');
const { directorRouter, testimonialsRouter, announcementsRouter } = require('./routes/content');
const { usersRouter, dashboardRouter } = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/gallery', galleryRouter);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/track-application', trackingRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', usersProfileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public/settings', publicSettingsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/admin/audit-logs', auditLogsRoutes);
app.use('/api/director', directorRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/dashboard', dashboardRouter);

// ── Health Check ──────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const checks = { database: 'ok', smtp: 'not_configured', emailOutbox: { pending: 0, failed: 0, stuck: 0, status: 'ok' } };
  try {
    await pool.query('SELECT 1 AS alive');
  } catch (error) {
    checks.database = 'error';
    checks.databaseError = error.code || 'DATABASE_ERROR';
  }

  if (process.env.SMTP_HOST && process.env.SMTP_FROM) {
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS } } : {}),
      connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 4000,
    });
    try { await transporter.verify(); checks.smtp = 'ok'; }
    catch (error) { checks.smtp = 'error'; checks.smtpError = error.code || 'SMTP_ERROR'; }
    finally { transporter.close(); }
  }

  try {
    const counts = await pool.query(
      `SELECT SUM(status = 'PENDING') AS pending, SUM(status = 'FAILED') AS failed,
        SUM(status = 'PROCESSING' AND processed_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)) AS stuck
       FROM email_outbox`
    );
    checks.emailOutbox.pending = Number(counts.rows[0].pending || 0);
    checks.emailOutbox.failed = Number(counts.rows[0].failed || 0);
    checks.emailOutbox.stuck = Number(counts.rows[0].stuck || 0);
    if (checks.emailOutbox.pending > 20 || checks.emailOutbox.failed > 5 || checks.emailOutbox.stuck > 0) checks.emailOutbox.status = 'alert';
  } catch (error) {
    checks.emailOutbox.status = 'error';
    checks.emailOutbox.error = error.code || 'OUTBOX_ERROR';
  }

  const ready = checks.database === 'ok' && checks.smtp !== 'error'
    && checks.emailOutbox.status === 'ok';
  res.status(ready ? 200 : 503).json({
    status: ready ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    checks,
  });
});

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    level: 'error', timestamp: new Date().toISOString(), requestId: req.requestId,
    method: req.method, path: req.originalUrl, message: err.message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  }));

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds limit (5MB max).' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🏦 Obotantim Cooperative API`);
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health\n`);
  });
}

module.exports = app;

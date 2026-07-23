const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./config/db'); // Ensure your database pool/connection is imported here

// Explicitly load .env from the root directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// ── Security ─────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.set('trust proxy', 1);

// ── Rate Limiting ─────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 100, // High limit for development
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDev && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'),
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Routes ────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const { galleryRouter } = require('./routes/gallery');
const registrationsRoutes = require('./routes/registrations');
const messagesRoutes = require('./routes/messages');
const { directorRouter, testimonialsRouter, announcementsRouter } = require('./routes/content');
const { usersRouter, dashboardRouter } = require('./routes/admin');
const notificationsRoutes = require('./routes/notificationsRoutes'); 

// Helper to prevent response caching on dynamic API data
const setNoCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/gallery', galleryRouter);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/director', directorRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/dashboard', setNoCache, dashboardRouter); 
app.use('/api/admin/notifications', notificationsRoutes); 

// ── Permissions Endpoint (Updated SQL Column) ──────────────────
app.get('/api/admin/permissions', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, widget_key, label, allowed_roles, is_visible FROM dashboard_permissions'
    );
    res.json(rows);
  } catch (err) {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// ── Frontend Production Static Serving ────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route to support React Router client-side navigation
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);

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
app.listen(PORT, () => {
  console.log(`\n🏦 Obotantim Cooperative API`);
  console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;

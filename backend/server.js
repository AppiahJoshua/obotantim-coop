const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const db = require('./config/database'); // Imports your PostgreSQL database pool
require('dotenv').config();

const app = express();

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

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Auto Database Schema Initialization ───────────────────────
async function initializeDatabaseSchema() {
  try {
    const schemaPath = path.join(__dirname, 'src', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      console.log('🔄 Verifying and executing database schema...');
      await db.query(sql);
      console.log('✅ Database tables and seed data are ready!');
    } else {
      console.warn('⚠️ schema.sql file not found at src/schema.sql');
    }
  } catch (err) {
    console.error('ℹ️ Database initialization note:', err.message);
  }
}

// ── Routes ────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const { galleryRouter } = require('./routes/gallery');
const registrationsRoutes = require('./routes/registrations');
const messagesRoutes = require('./routes/messages');
const { directorRouter, testimonialsRouter, announcementsRouter } = require('./routes/content');
const { usersRouter, dashboardRouter } = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/gallery', galleryRouter);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/director', directorRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/dashboard', dashboardRouter);

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

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

initializeDatabaseSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏦 Obotantim Cooperative API`);
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health\n`);
  });
});

module.exports = app;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── POST /api/auth/login ──────────────────────────────────────
const login = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Valid email and password are required.' });
      }

      const { email, password } = req.body;

      const [rows] = await pool.query(
        'SELECT * FROM admin_users WHERE email = ?',
        [email]
      );

      const user = rows[0];
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (!user.is_active) {
        return res.status(401).json({
          error: 'Your account has been deactivated. Contact the Super Admin.',
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Update last login timestamp
      await pool.query(
        'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
        [user.id]
      );

      const token = generateToken(user);

      await auditLog(
        { user, ip: req.ip, headers: req.headers },
        'LOGIN',
        'admin_users',
        user.id
      );

      res.json({
        token,
        user: {
          id:    user.id,
          name:  user.name,
          email: user.email,
          role:  user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  },
];

// ── GET /api/auth/me ──────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, last_login, created_at FROM admin_users WHERE id = ?',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/auth/change-password ─────────────────────────────
const changePassword = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const [rows] = await pool.query(
        'SELECT password FROM admin_users WHERE id = ?',
        [req.user.id]
      );

      const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await pool.query(
        'UPDATE admin_users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashed, req.user.id]
      );

      await auditLog(req, 'CHANGE_PASSWORD', 'admin_users', req.user.id);

      res.json({ message: 'Password changed successfully.' });
    } catch (err) {
      next(err);
    }
  },
];

module.exports = { login, getMe, changePassword };
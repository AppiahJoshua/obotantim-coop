const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// ── Hard authenticate — blocks if no valid token ──────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid token.' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active FROM admin_users WHERE id = ?',
      [decoded.id]
    );

    if (!rows[0]) {
      return res.status(401).json({ error: 'Account not found.' });
    }
    if (!rows[0].is_active) {
      return res.status(401).json({ error: 'Account has been deactivated.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

// ── Optional authenticate — attaches user but never blocks ────
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next();
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active FROM admin_users WHERE id = ?',
      [decoded.id]
    );

    if (rows[0] && rows[0].is_active) {
      req.user = rows[0];
    }
    next();
  } catch (err) {
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate };
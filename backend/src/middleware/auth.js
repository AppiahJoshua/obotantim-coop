const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and is active
    const result = await pool.query(
      'SELECT id, name, email, role, is_active FROM admin_users WHERE id = $1',
      [decoded.id]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Account not found.' });
    }

    if (!result.rows[0].is_active) {
      return res.status(401).json({ error: 'Account has been deactivated.' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    next(err);
  }
};

// Attaches req.user if a valid token is present, but never blocks the request.
// Used on public GET endpoints that show extra data (e.g. inactive items) to logged-in staff.
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, name, email, role, is_active FROM admin_users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows[0] && result.rows[0].is_active) {
      req.user = result.rows[0];
    }
    next();
  } catch (err) {
    // Invalid/expired token on an optional route — just proceed unauthenticated
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate };

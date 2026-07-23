const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

// ── GET /api/admin/users ──────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, is_active, last_login, created_at
       FROM admin_users
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// ── POST /api/admin/users ─────────────────────────────────────
const create = [
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password, role } = req.body;
      const hashed = await bcrypt.hash(password, 12);

      const [result] = await pool.query(
        'INSERT INTO admin_users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashed, role]
      );

      const [newRows] = await pool.query(
        'SELECT id, name, email, role, is_active, created_at FROM admin_users WHERE id = ?',
        [result.insertId]
      );

      await auditLog(req, 'CREATE_USER', 'admin_users', result.insertId, { email, role });
      res.status(201).json(newRows[0]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        return res.status(409).json({ error: 'Email already in use.' });
      }
      next(err);
    }
  },
];

// ── PUT /api/admin/users/:id ──────────────────────────────────
const update = async (req, res, next) => {
  try {
    const { name, email, role, is_active } = req.body;

    if (parseInt(req.params.id) === req.user.id && is_active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    const isActiveVal = is_active !== undefined ? (is_active ? 1 : 0) : null;

    const [result] = await pool.query(
      `UPDATE admin_users SET
         name      = COALESCE(?, name),
         email     = COALESCE(?, email),
         role      = COALESCE(?, role),
         is_active = COALESCE(?, is_active),
         updated_at = NOW()
       WHERE id = ?`,
      [name || null, email || null, role || null, isActiveVal, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const [updated] = await pool.query(
      'SELECT id, name, email, role, is_active FROM admin_users WHERE id = ?',
      [req.params.id]
    );

    await auditLog(req, 'UPDATE_USER', 'admin_users', req.params.id, { role, is_active });
    res.json(updated[0]);
  } catch (err) { next(err); }
};

// ── PUT /api/admin/users/:id/reset-password ───────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    const [result] = await pool.query(
      'UPDATE admin_users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashed, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await auditLog(req, 'RESET_USER_PASSWORD', 'admin_users', req.params.id);
    res.json({ message: 'Password reset successfully.' });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/users/:id ───────────────────────────────
const remove = async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const [result] = await pool.query(
      'DELETE FROM admin_users WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await auditLog(req, 'DELETE_USER', 'admin_users', req.params.id);
    res.json({ message: 'User deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, update, resetPassword, remove };
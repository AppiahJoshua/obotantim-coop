const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

// GET /api/admin/users — super_admin only
const getAll = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, last_login, created_at FROM admin_users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// POST /api/admin/users — super_admin only
const create = [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['super_admin', 'manager', 'content_editor']),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password, role } = req.body;
      const hashed = await bcrypt.hash(password, 12);

      const result = await pool.query(
        'INSERT INTO admin_users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role, is_active, created_at',
        [name, email, hashed, role]
      );
      await auditLog(req, 'CREATE_USER', 'admin_users', result.rows[0].id, { email, role });
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already in use.' });
      next(err);
    }
  },
];

// PUT /api/admin/users/:id — super_admin only
const update = async (req, res, next) => {
  try {
    const { name, email, role, is_active } = req.body;

    // Prevent super_admin from deactivating themselves
    if (parseInt(req.params.id) === req.user.id && is_active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    const result = await pool.query(
      `UPDATE admin_users SET
        name=COALESCE($1,name), email=COALESCE($2,email),
        role=COALESCE($3,role), is_active=COALESCE($4,is_active), updated_at=NOW()
       WHERE id=$5 RETURNING id, name, email, role, is_active`,
      [name, email, role, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    await auditLog(req, 'UPDATE_USER', 'admin_users', req.params.id, { role, is_active });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id/reset-password — super_admin only
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE admin_users SET password=$1, updated_at=NOW() WHERE id=$2', [hashed, req.params.id]);
    await auditLog(req, 'RESET_USER_PASSWORD', 'admin_users', req.params.id);
    res.json({ message: 'Password reset successfully.' });
  } catch (err) { next(err); }
};

// DELETE /api/admin/users/:id — super_admin only
const remove = async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }
    await pool.query('DELETE FROM admin_users WHERE id=$1', [req.params.id]);
    await auditLog(req, 'DELETE_USER', 'admin_users', req.params.id);
    res.json({ message: 'User deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, update, resetPassword, remove };

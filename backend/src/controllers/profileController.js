const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

const getProfile = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, mfa_enabled, created_at FROM admin_users WHERE id = ?',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Staff profile not found.' });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name?.trim() || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A name and valid email address are required.' });
    }

    await pool.query(
      'UPDATE admin_users SET name = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [name.trim(), email.trim().toLowerCase(), req.user.id]
    );
    const result = await pool.query(
      'SELECT id, name, email, role, mfa_enabled, created_at FROM admin_users WHERE id = ?',
      [req.user.id]
    );
    await auditLog(req, 'UPDATE_OWN_PROFILE', 'admin_users', req.user.id);
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email is already in use.' });
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Current password and a new password of at least 8 characters are required.' });
    }
    const result = await pool.query('SELECT password FROM admin_users WHERE id = ?', [req.user.id]);
    if (!result.rows[0] || !(await bcrypt.compare(currentPassword, result.rows[0].password))) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE admin_users SET password = ?, token_version = token_version + 1, updated_at = NOW() WHERE id = ?', [passwordHash, req.user.id]);
    await auditLog(req, 'CHANGE_PASSWORD', 'admin_users', req.user.id);
    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, changePassword };

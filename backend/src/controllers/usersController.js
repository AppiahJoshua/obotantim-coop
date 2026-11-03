const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const auditLog = require('../utils/auditLog');
const speakeasy = require('speakeasy');
const { decryptMfaSecret } = require('../utils/mfaSecrets');
const { MODULES_BY_ROLE, parseDisabledModules } = require('../utils/moduleAccess');

// GET /api/admin/users — super_admin only
const getAll = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, mfa_enabled, disabled_modules, last_login, created_at FROM admin_users ORDER BY created_at DESC'
    );
    res.json(result.rows.map((user) => ({
      ...user,
      disabled_modules: parseDisabledModules(user.disabled_modules),
    })));
  } catch (err) { next(err); }
};

const getModuleAccess = (req, res) => {
  res.json({ disabledModules: parseDisabledModules(req.user.disabled_modules) });
};

const updateModuleAccess = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const disabledModules = req.body?.disabledModules;
    if (!Number.isSafeInteger(userId) || userId < 1 || !Array.isArray(disabledModules)
      || disabledModules.some((module) => typeof module !== 'string')) {
      return res.status(400).json({ error: 'Provide a valid staff member and module list.' });
    }

    const targetResult = await pool.query('SELECT id, name, role FROM admin_users WHERE id = ?', [userId]);
    const target = targetResult.rows[0];
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.role === 'super_admin') {
      return res.status(400).json({ error: 'Super admins always retain full access.' });
    }

    const roleModules = MODULES_BY_ROLE[target.role] || [];
    const uniqueModules = [...new Set(disabledModules)];
    if (uniqueModules.some((module) => !roleModules.includes(module))) {
      return res.status(400).json({ error: 'A disabled module is not available for this staff role.' });
    }

    await pool.query(
      'UPDATE admin_users SET disabled_modules = ?, token_version = token_version + 1, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(uniqueModules), userId]
    );
    await auditLog(req, 'UPDATE_USER_MODULE_ACCESS', 'admin_users', userId, { disabledModules: uniqueModules });
    res.json({ userId, disabledModules: uniqueModules });
  } catch (error) {
    next(error);
  }
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

      const insert = await pool.query(
        'INSERT INTO admin_users (name, email, password, role) VALUES (?,?,?,?)',
        [name, email, hashed, role]
      );
      const result = await pool.query(
        'SELECT id, name, email, role, is_active, created_at FROM admin_users WHERE id = ?',
        [insert.insertId]
      );
      await auditLog(req, 'CREATE_USER', 'admin_users', result.rows[0].id, { email, role });
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already in use.' });
      next(err);
    }
  },
];

// PUT /api/admin/users/:id — super_admin only
const update = async (req, res, next) => {
  try {
    const { name, email, role, is_active } = req.body;
    let normalizedEmail = email;

    if (email !== undefined) {
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }
      normalizedEmail = email.trim().toLowerCase();
    }

    // Prevent super_admin from deactivating themselves
    if (parseInt(req.params.id) === req.user.id && is_active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    await pool.query(
      `UPDATE admin_users SET
        name=COALESCE(?,name), email=COALESCE(?,email),
        role=COALESCE(?,role), is_active=COALESCE(?,is_active),
        token_version = token_version + 1,
        updated_at=NOW()
       WHERE id=?`,
      [name, normalizedEmail, role, is_active, req.params.id]
    );
    const result = await pool.query('SELECT id, name, email, role, is_active FROM admin_users WHERE id = ?', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    await auditLog(req, 'UPDATE_USER', 'admin_users', req.params.id, { email: normalizedEmail, role, is_active });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already in use.' });
    next(err);
  }
};

// PUT /api/admin/users/:id/reset-password — super_admin only
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE admin_users SET password=?, token_version=token_version+1, updated_at=NOW() WHERE id=?', [hashed, req.params.id]);
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
    await pool.query('UPDATE admin_users SET is_active = FALSE, token_version = token_version + 1, updated_at = NOW() WHERE id=?', [req.params.id]);
    await auditLog(req, 'DELETE_USER', 'admin_users', req.params.id);
    res.json({ message: 'User deactivated and all active sessions revoked.' });
  } catch (err) { next(err); }
};

const setMfa = async (req, res, next) => {
  try {
    const enabled = req.body?.enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean.' });
    const id = Number.parseInt(req.params.id, 10);
    const target = await pool.query('SELECT id, mfa_enabled, mfa_secret FROM admin_users WHERE id = ?', [id]);
    if (!target.rows[0]) return res.status(404).json({ error: 'User not found.' });
    if (enabled) {
      const code = String(req.body?.code || '').replace(/\s/g, '');
      if (!target.rows[0].mfa_secret || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'The user must have an authenticator configured; provide its current 6-digit code to enable MFA.' });
      }
      const valid = speakeasy.totp.verify({
        secret: decryptMfaSecret(target.rows[0].mfa_secret),
        encoding: 'base32', token: code, window: 1,
      });
      if (!valid) return res.status(400).json({ error: 'The authenticator code is invalid.' });
    }
    await pool.query(
      'UPDATE admin_users SET mfa_enabled = ?, token_version = token_version + 1, updated_at = NOW() WHERE id = ?',
      [enabled, id]
    );
    await auditLog(req, enabled ? 'REQUIRE_MFA' : 'DISABLE_MFA', 'admin_users', id);
    res.json({ message: enabled ? 'MFA is required for this user.' : 'MFA disabled and sessions revoked.' });
  } catch (error) { next(error); }
};

const revokeSessions = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const result = await pool.query('UPDATE admin_users SET token_version = token_version + 1 WHERE id = ?', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'User not found.' });
    await auditLog(req, 'REVOKE_USER_SESSIONS', 'admin_users', id);
    res.json({ message: 'All active sessions revoked.' });
  } catch (error) { next(error); }
};

module.exports = { getAll, create, update, getModuleAccess, updateModuleAccess, resetPassword, remove, setMfa, revokeSessions };

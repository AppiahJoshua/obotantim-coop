const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const auditLog = require('../utils/auditLog');
const { encryptMfaSecret, decryptMfaSecret } = require('../utils/mfaSecrets');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, tokenVersion: Number(user.token_version || 0) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const genericResetMessage = 'If an account with that email exists, a reset link has been sent.';

const forgotPassword = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ message: genericResetMessage });
  }

  try {
    const result = await pool.query(
      'SELECT id, email FROM admin_users WHERE email = ? AND is_active = TRUE LIMIT 1',
      [email]
    );
    const user = result.rows[0];
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const resetUrl = new URL('/admin/reset-password', process.env.FRONTEND_URL || 'http://localhost:5173');
      resetUrl.searchParams.set('token', rawToken);
      resetUrl.searchParams.set('email', user.email);

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          'UPDATE admin_users SET reset_token_hash = ?, reset_token_expires_at = ? WHERE id = ?',
          [tokenHash, expiresAt, user.id]
        );
        await connection.execute(
          `INSERT INTO email_outbox
            (recipient_user_id, event_type, recipient_email, subject, template_name, payload_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [user.id, 'password.reset', user.email, 'Reset your admin password', 'password_reset', JSON.stringify({ resetUrl: resetUrl.toString() })]
        );
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Forgot password request could not be processed:', error.message);
  }

  return res.json({ message: genericResetMessage });
};

const resetPassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const token = String(req.body?.token || '');
    const newPassword = req.body?.newPassword;
    if (!email || !token || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'The reset link is invalid or expired. Request a new link and try again.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const userResult = await pool.query(
      `SELECT id, email, role FROM admin_users
       WHERE email = ? AND is_active = TRUE AND reset_token_hash = ? AND reset_token_expires_at > NOW()
       LIMIT 1`,
      [email, tokenHash]
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'The reset link is invalid or expired. Request a new link and try again.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const update = await pool.query(
      `UPDATE admin_users
         SET password = ?, reset_token_hash = NULL, reset_token_expires_at = NULL,
           token_version = token_version + 1, updated_at = NOW()
       WHERE id = ? AND reset_token_hash = ? AND reset_token_expires_at > NOW()`,
      [passwordHash, user.id, tokenHash]
    );
    if (!update.rowCount) {
      return res.status(400).json({ error: 'The reset link is invalid or expired. Request a new link and try again.' });
    }

    await auditLog({ user, ip: req.ip, headers: req.headers }, 'RESET_PASSWORD', 'admin_users', user.id);
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
};

const setupMfa = async (req, res, next) => {
  try {
    const current = await pool.query('SELECT mfa_enabled FROM admin_users WHERE id = ?', [req.user.id]);
    if (current.rows[0]?.mfa_enabled) {
      return res.status(409).json({ error: 'MFA is already enabled. Ask a Super Admin to disable it before enrolling a new device.' });
    }
    const secret = speakeasy.generateSecret({
      name: `Obotantim Cooperative (${req.user.email})`,
      issuer: 'Obotantim Cooperative',
      length: 32,
    });
    await pool.query(
      'UPDATE admin_users SET mfa_secret = ?, mfa_enabled = FALSE WHERE id = ?',
      [encryptMfaSecret(secret.base32), req.user.id]
    );
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qrCodeDataUrl, manualEntryKey: secret.base32 });
  } catch (error) {
    next(error);
  }
};

const verifyMfaSetup = async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit authenticator code.' });
    const result = await pool.query('SELECT mfa_secret FROM admin_users WHERE id = ?', [req.user.id]);
    if (!result.rows[0]?.mfa_secret) return res.status(400).json({ error: 'Start MFA setup before verifying a code.' });
    const valid = speakeasy.totp.verify({
      secret: decryptMfaSecret(result.rows[0].mfa_secret),
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) return res.status(400).json({ error: 'Authenticator code is invalid.' });

    await pool.query('UPDATE admin_users SET mfa_enabled = TRUE, token_version = token_version + 1 WHERE id = ?', [req.user.id]);
    await auditLog(req, 'ENABLE_MFA', 'admin_users', req.user.id);
    res.json({ message: 'MFA enabled. Sign in again to use it.' });
  } catch (error) {
    next(error);
  }
};

const verifyMfaLogin = async (req, res, next) => {
  try {
    const { mfaToken } = req.body || {};
    const code = String(req.body?.code || '').replace(/\s/g, '');
    if (!mfaToken || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'A valid MFA challenge and 6-digit code are required.' });
    const challenge = jwt.verify(mfaToken, process.env.JWT_SECRET);
    if (challenge.purpose !== 'mfa') return res.status(401).json({ error: 'Invalid MFA challenge.' });

    const result = await pool.query(
      'SELECT id, name, email, role, is_active, mfa_enabled, mfa_secret, token_version FROM admin_users WHERE id = ?',
      [challenge.id]
    );
    const user = result.rows[0];
    if (!user || !user.is_active || !user.mfa_enabled || Number(user.token_version || 0) !== Number(challenge.tokenVersion)) {
      return res.status(401).json({ error: 'MFA challenge is invalid or expired. Sign in again.' });
    }
    const valid = speakeasy.totp.verify({
      secret: decryptMfaSecret(user.mfa_secret), encoding: 'base32', token: code, window: 1,
    });
    if (!valid) return res.status(401).json({ error: 'Invalid authenticator code.' });

    await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [user.id]);
    await auditLog({ user, ip: req.ip, headers: req.headers }, 'LOGIN_MFA', 'admin_users', user.id);
    res.json({
      token: generateToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'MFA challenge is invalid or expired. Sign in again.' });
    }
    next(error);
  }
};

const disableMfa = async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const code = String(req.body?.code || '').replace(/\s/g, '');
    if (!currentPassword || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter your current password and 6-digit authenticator code.' });
    }

    const result = await pool.query(
      'SELECT password, mfa_secret, mfa_enabled FROM admin_users WHERE id = ? AND is_active = TRUE',
      [req.user.id]
    );
    const account = result.rows[0];
    if (!account || !account.mfa_enabled || !account.mfa_secret) {
      return res.status(400).json({ error: 'MFA is not enabled for this account.' });
    }
    if (!(await bcrypt.compare(currentPassword, account.password))) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    const validCode = speakeasy.totp.verify({
      secret: decryptMfaSecret(account.mfa_secret),
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!validCode) return res.status(400).json({ error: 'Authenticator code is invalid.' });

    const update = await pool.query(
      `UPDATE admin_users
       SET mfa_enabled = FALSE, mfa_secret = NULL, token_version = token_version + 1, updated_at = NOW()
       WHERE id = ? AND mfa_enabled = TRUE`,
      [req.user.id]
    );
    if (!update.rowCount) return res.status(409).json({ error: 'MFA settings changed. Refresh and try again.' });

    await auditLog(req, 'DISABLE_MFA', 'admin_users', req.user.id);
    res.json({ message: 'MFA disabled. Sign in again to continue.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
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

      const result = await pool.query(
        'SELECT * FROM admin_users WHERE email = ?',
        [email]
      );

      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (!user.is_active) {
        return res.status(401).json({ error: 'Your account has been deactivated. Contact the Super Admin.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (user.mfa_enabled) {
        const mfaToken = jwt.sign(
          { id: user.id, purpose: 'mfa', tokenVersion: Number(user.token_version || 0) },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        );
        return res.json({ mfaRequired: true, mfaToken });
      }

      // Update last login
      await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [user.id]);

      const token = generateToken(user);

      await auditLog({ user, ip: req.ip, headers: req.headers }, 'LOGIN', 'admin_users', user.id);

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  },
];

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, mfa_enabled, last_login, created_at FROM admin_users WHERE id = ?',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
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

      const result = await pool.query('SELECT password FROM admin_users WHERE id = ?', [req.user.id]);
      const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);

      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await pool.query(
        'UPDATE admin_users SET password = ?, token_version = token_version + 1, updated_at = NOW() WHERE id = ?',
        [hashed, req.user.id]
      );

      await auditLog(req, 'CHANGE_PASSWORD', 'admin_users', req.user.id);

      res.json({ message: 'Password changed successfully.' });
    } catch (err) {
      next(err);
    }
  },
];

module.exports = {
  login, getMe, changePassword, forgotPassword, resetPassword,
  setupMfa, verifyMfaSetup, verifyMfaLogin, disableMfa,
};

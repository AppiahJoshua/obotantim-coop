process.env.JWT_SECRET = 'test-secret-for-integration-only';
process.env.NODE_ENV = 'test';
process.env.MFA_ENCRYPTION_KEY = 'ab'.repeat(32);

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));
jest.mock('../src/utils/auditLog', () => jest.fn().mockResolvedValue(undefined));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const request = require('supertest');
const pool = require('../src/config/database');
const app = require('../src/server');
const { notifyStaff } = require('../src/utils/notifications');
const { encryptMfaSecret } = require('../src/utils/mfaSecrets');

const issueToken = (user) => jwt.sign({ id: user.id, role: user.role, tokenVersion: 0 }, process.env.JWT_SECRET);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('security hardening HTTP integration', () => {
  test('admin password login issues a session token', async () => {
    const password = 'Correct-Horse-Battery-1';
    const passwordHash = await bcrypt.hash(password, 4);
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT * FROM admin_users WHERE email')) return { rows: [{ id: 8, name: 'Admin', email: 'admin@example.com', role: 'super_admin', is_active: 1, mfa_enabled: 0, token_version: 0, password: passwordHash }] };
      if (sql.includes('UPDATE admin_users SET last_login')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    const response = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
  });

  test('settings route rejects a content editor', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 9, name: 'Editor', email: 'editor@example.com', role: 'content_editor', is_active: 1, token_version: 0 }] });
    const response = await request(app).get('/api/settings').set('Authorization', `Bearer ${issueToken({ id: 9, role: 'content_editor' })}`);
    expect(response.status).toBe(403);
  });

  test('disabled dashboard modules are blocked by their API routes', async () => {
    pool.query.mockResolvedValue({ rows: [{
      id: 9, name: 'Manager', email: 'manager@example.com', role: 'manager',
      is_active: 1, token_version: 0, disabled_modules: ['messages'],
    }] });

    const response = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${issueToken({ id: 9, role: 'manager' })}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/disabled/i);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('password reset is one-use and rejects a second use', async () => {
    let used = false;
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, email, role FROM admin_users')) {
        if (used) return { rows: [] };
        return { rows: [{ id: 3, email: 'staff@example.com', role: 'manager' }] };
      }
      if (sql.includes('UPDATE admin_users') && sql.includes('reset_token_hash = NULL')) {
        used = true;
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const payload = { email: 'staff@example.com', token: 'a'.repeat(64), newPassword: 'new-secure-password' };
    const first = await request(app).post('/api/auth/reset-password').send(payload);
    const second = await request(app).post('/api/auth/reset-password').send(payload);
    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
  });

  test('expired password reset token is rejected', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, email, role FROM admin_users')) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    const response = await request(app).post('/api/auth/reset-password').send({
      email: 'staff@example.com', token: 'b'.repeat(64), newPassword: 'new-secure-password',
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/invalid or expired/i);
  });

  test('notification preferences filter staff in-app and email delivery', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT u.id, u.email')) return { rows: [
        { id: 1, email: 'email-only@example.com', in_app_enabled: 0, email_enabled: 1 },
        { id: 2, email: 'app-only@example.com', in_app_enabled: 1, email_enabled: 0 },
      ] };
      return { rows: [], rowCount: 1, insertId: 1 };
    });

    await notifyStaff({ eventType: 'registration.created', title: 'New registration', body: 'A new application arrived.' });
    const notificationInsert = pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO notifications'));
    const emailInserts = pool.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO email_outbox'));
    expect(notificationInsert[1][0]).toBe(2);
    expect(emailInserts).toHaveLength(1);
    expect(emailInserts[0][1][2]).toBe('email-only@example.com');
  });

  test('super admin can read settings', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, name, email, role, is_active, token_version')) return { rows: [{ id: 1, name: 'Admin', email: 'admin@example.com', role: 'super_admin', is_active: 1, token_version: 0 }] };
      if (sql.includes('FROM settings ORDER BY')) return { rows: [{ setting_key: 'maintenance_mode', setting_value: false }] };
      return { rows: [], rowCount: 1 };
    });
    const response = await request(app).get('/api/settings').set('Authorization', `Bearer ${issueToken({ id: 1, role: 'super_admin' })}`);
    expect(response.status).toBe(200);
    expect(response.body.maintenance_mode).toBe(false);
  });

  test('super admin can update a staff email', async () => {
    let updatedEmail;
    pool.query.mockImplementation(async (sql, params) => {
      if (sql.includes('SELECT id, name, email, role, is_active, token_version')) {
        return { rows: [{ id: 1, name: 'Admin', email: 'admin@example.com', role: 'super_admin', is_active: 1, token_version: 0 }] };
      }
      if (sql.startsWith('UPDATE admin_users SET')) {
        updatedEmail = params[1];
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('SELECT id, name, email, role, is_active FROM admin_users WHERE id = ?')) {
        return { rows: [{ id: 2, name: 'Staff', email: updatedEmail, role: 'manager', is_active: 1 }] };
      }
      return { rows: [], rowCount: 1 };
    });

    const response = await request(app)
      .put('/api/admin/users/2')
      .set('Authorization', `Bearer ${issueToken({ id: 1, role: 'super_admin' })}`)
      .send({ email: ' Staff.New@Example.com ' });

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('staff.new@example.com');
    expect(updatedEmail).toBe('staff.new@example.com');
  });

  test('super admin can disable an available module for a staff account', async () => {
    let updateValues;
    pool.query.mockImplementation(async (sql, params) => {
      if (sql.includes('SELECT id, name, email, role, is_active, token_version')) {
        return { rows: [{ id: 1, name: 'Admin', email: 'admin@example.com', role: 'super_admin', is_active: 1, token_version: 0 }] };
      }
      if (sql.includes('SELECT id, name, role FROM admin_users')) {
        return { rows: [{ id: 2, name: 'Manager', role: 'manager' }] };
      }
      if (sql.startsWith('UPDATE admin_users SET disabled_modules')) {
        updateValues = params;
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    const response = await request(app)
      .put('/api/admin/users/2/modules')
      .set('Authorization', `Bearer ${issueToken({ id: 1, role: 'super_admin' })}`)
      .send({ disabledModules: ['messages'] });

    expect(response.status).toBe(200);
    expect(response.body.disabledModules).toEqual(['messages']);
    expect(JSON.parse(updateValues[0])).toEqual(['messages']);
    expect(updateValues[1]).toBe(2);
  });

  test('super admin can update validated settings', async () => {
    const connection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockResolvedValue([{}, []]),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };
    pool.getConnection.mockResolvedValue(connection);
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, name, email, role, is_active, token_version')) return { rows: [{ id: 1, name: 'Admin', email: 'admin@example.com', role: 'super_admin', is_active: 1, token_version: 0 }] };
      return { rows: [], rowCount: 1 };
    });
    const response = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${issueToken({ id: 1, role: 'super_admin' })}`)
      .send({ settings: { maintenance_mode: true } });
    expect(response.status).toBe(200);
    expect(connection.commit).toHaveBeenCalled();
  });

  test('self-service MFA disable requires password and valid TOTP, then revokes sessions', async () => {
    const password = 'Correct-Horse-Battery-1';
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    const passwordHash = await bcrypt.hash(password, 4);
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, name, email, role, is_active, token_version')) {
        return { rows: [{ id: 12, name: 'Staff', email: 'staff@example.com', role: 'manager', is_active: 1, token_version: 0 }] };
      }
      if (sql.includes('SELECT password, mfa_secret, mfa_enabled')) {
        return { rows: [{ password: passwordHash, mfa_secret: encryptMfaSecret(secret), mfa_enabled: 1 }] };
      }
      if (sql.includes('SET mfa_enabled = FALSE')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const auth = { Authorization: `Bearer ${issueToken({ id: 12, role: 'manager' })}` };
    const code = speakeasy.totp({ secret, encoding: 'base32' });

    const rejected = await request(app).post('/api/auth/mfa/disable').set(auth).send({ currentPassword: 'wrong-password', code });
    expect(rejected.status).toBe(400);
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('SET mfa_enabled = FALSE'))).toBe(false);

    const accepted = await request(app).post('/api/auth/mfa/disable').set(auth).send({ currentPassword: password, code });
    expect(accepted.status).toBe(200);
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('SET mfa_enabled = FALSE') && sql.includes('token_version = token_version + 1'))).toBe(true);
  });
});

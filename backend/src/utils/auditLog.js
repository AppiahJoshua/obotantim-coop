const pool = require('../config/database');

const normalizeIp = (ip) => {
  if (typeof ip !== 'string' || !ip.trim()) return 'unknown';
  const address = ip.split(',')[0].trim();
  if (address === '::1') return '127.0.0.1';
  if (address.toLowerCase().startsWith('::ffff:')) return address.slice(7);
  return address;
};

const auditLog = async (req, action, resource = null, resourceId = null, details = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action, resource, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user?.id || null,
        req.user?.email || 'system',
        req.user?.role || null,
        action,
        resource,
        resourceId,
        details ? JSON.stringify(details) : null,
        normalizeIp(req.ip),
      ]
    );
  } catch (err) {
    // Non-blocking — log errors but don't crash requests
    console.error('Audit log error:', err.message);
  }
};

module.exports = auditLog;

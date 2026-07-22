const pool = require('../config/database');

const auditLog = async (req, action, resource = null, resourceId = null, details = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs 
        (user_id, user_email, user_role, action, resource, resource_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user?.id || null,
        req.user?.email || 'system',
        req.user?.role || null,
        action,
        resource,
        resourceId ? String(resourceId) : null,
        details ? JSON.stringify(details) : null,
        req.ip || req.headers['x-forwarded-for'] || 'unknown',
      ]
    );
  } catch (err) {
    // Non-blocking — never crash a real request over a logging failure
    console.error('Audit log error:', err.message);
  }
};

module.exports = auditLog;
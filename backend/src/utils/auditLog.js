const pool = require('../config/database');

const auditLog = async (req, action, resource = null, resourceId = null, details = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action, resource, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user?.id || null,
        req.user?.email || 'system',
        req.user?.role || null,
        action,
        resource,
        resourceId,
        details ? JSON.stringify(details) : null,
        req.ip || req.headers['x-forwarded-for'] || 'unknown',
      ]
    );
  } catch (err) {
    // Non-blocking — log errors but don't crash requests
    console.error('Audit log error:', err.message);
  }
};

module.exports = auditLog;

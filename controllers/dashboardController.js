const pool = require('../config/database');

// ── GET /api/admin/dashboard ──────────────────────────────────
const getOverview = async (req, res, next) => {
  try {
    // 1. Fetch widgets where the user's role is allowed in the comma-separated list
    const [permRows] = await pool.query(
      'SELECT widget_key FROM dashboard_permissions WHERE FIND_IN_SET(?, allowed_roles) AND is_visible = 1',
      [req.user.role]
    );
    
    // Map the database rows to a clean array of strings: ['gallery', 'registrations']
    const allowedWidgets = permRows.map(row => row.widget_key);

    // 2. Run all metric queries in parallel for performance.
    const [
      [userRows],
      [regRows],
      [msgRows],
      [prodRows],
      [galleryRows],
      [statusRows],
      [serviceRows],
      [recentRegRows],
      [recentMsgRows],
      [auditRows],
    ] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) AS total FROM admin_users WHERE is_active = 1'
      ),
      pool.query(
        'SELECT COUNT(*) AS total FROM registrations'
      ),
      pool.query(
        'SELECT COUNT(*) AS total FROM contact_messages'
      ),
      pool.query(
        'SELECT COUNT(*) AS total FROM products WHERE is_active = 1'
      ),
      pool.query(
        'SELECT COUNT(*) AS total FROM gallery WHERE is_active = 1'
      ),
      pool.query(
        `SELECT status, COUNT(*) AS count
         FROM registrations
         GROUP BY status
         ORDER BY count DESC`
      ),
      pool.query(
        `SELECT service_type, COUNT(*) AS count
         FROM registrations
         GROUP BY service_type`
      ),
      pool.query(
        `SELECT id, full_name, phone, service_type, status, created_at
         FROM registrations
         ORDER BY created_at DESC
         LIMIT 5`
      ),
      pool.query(
        `SELECT id, name, email, subject, is_resolved, created_at
         FROM contact_messages
         ORDER BY created_at DESC
         LIMIT 5`
      ),
      pool.query(
        `SELECT al.*, u.name AS user_name
         FROM audit_logs al
         LEFT JOIN admin_users u ON al.user_id = u.id
         ORDER BY al.created_at DESC
         LIMIT 20`
      ),
    ]);

    // 3. Return the payload, including the new dynamic allowedWidgets list
    res.json({
      stats: {
        total_users:         Number(userRows[0].total),
        total_registrations: Number(regRows[0].total),
        total_messages:      Number(msgRows[0].total),
        total_products:      Number(prodRows[0].total),
        total_gallery:       Number(galleryRows[0].total),
      },
      registrationsByStatus:  statusRows,
      registrationsByService: serviceRows,
      recentRegistrations:    recentRegRows,
      recentMessages:         recentMsgRows,
      auditLogs:              auditRows,
      allowedWidgets, // <-- Send this array down to the frontend layout interface
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview };

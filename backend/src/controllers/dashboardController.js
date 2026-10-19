const pool = require('../config/database');

// GET /api/admin/dashboard
const getOverview = async (req, res, next) => {
  try {
    const [
      users, registrations, messages, products, gallery,
      registrationsByStatus, registrationsByService, recentRegistrations, recentMessages, auditLogs
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM admin_users WHERE is_active = true'),
      pool.query('SELECT COUNT(*) FROM registrations'),
      pool.query('SELECT COUNT(*) FROM contact_messages'),
      pool.query('SELECT COUNT(*) FROM products WHERE is_active = true'),
      pool.query('SELECT COUNT(*) FROM gallery WHERE is_active = true'),
      pool.query(`SELECT status, COUNT(*) as count FROM registrations GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT service_type, COUNT(*) as count FROM registrations GROUP BY service_type`),
      pool.query(`SELECT id, full_name, phone, service_type, status, created_at
                  FROM registrations ORDER BY created_at DESC LIMIT 5`),
      pool.query(`SELECT id, name, email, subject, is_resolved, created_at
                  FROM contact_messages ORDER BY created_at DESC LIMIT 5`),
      pool.query(`SELECT al.*, u.name as user_name FROM audit_logs al
                  LEFT JOIN admin_users u ON al.user_id = u.id
                  ORDER BY al.created_at DESC LIMIT 20`),
    ]);

    res.json({
      stats: {
        total_users: parseInt(users.rows[0].count),
        total_registrations: parseInt(registrations.rows[0].count),
        total_messages: parseInt(messages.rows[0].count),
        total_products: parseInt(products.rows[0].count),
        total_gallery: parseInt(gallery.rows[0].count),
      },
      registrationsByStatus: registrationsByStatus.rows,
      registrationsByService: registrationsByService.rows,
      recentRegistrations: recentRegistrations.rows,
      recentMessages: recentMessages.rows,
      auditLogs: auditLogs.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview };

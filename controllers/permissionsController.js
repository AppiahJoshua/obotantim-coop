const pool = require('../config/database');

// Get visibility flags for all roles (or a specific role)
const getWidgetPermissions = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT widget_key, label, is_visible, allowed_roles FROM dashboard_permissions');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Toggle a specific widget's visibility or configuration
const toggleWidgetVisibility = async (req, res, next) => {
  try {
    const { widget_key, is_visible, allowed_roles } = req.body;

    // Use an UPSERT statement targeting the unique widget_key
    await pool.query(`
      INSERT INTO dashboard_permissions (widget_key, is_visible, allowed_roles)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        is_visible = VALUES(is_visible),
        allowed_roles = VALUES(allowed_roles)
    `, [widget_key, is_visible ? 1 : 0, allowed_roles || '']);

    res.json({ message: 'Permissions updated successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getWidgetPermissions, toggleWidgetVisibility };

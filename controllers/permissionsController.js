const pool = require('../config/database');

// Get visibility flags for all roles (or a specific role)
const getWidgetPermissions = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT role_name, widget_key, is_visible FROM dashboard_permissions');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Toggle a specific widget's visibility for a specific role
const toggleWidgetVisibility = async (req, res, next) => {
  try {
    const { role_name, widget_key, is_visible } = req.body;

    // Use an UPSERT statement to insert a new setting or change an existing one
    await pool.query(`
      INSERT INTO dashboard_permissions (role_name, widget_key, is_visible)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE is_visible = VALUES(is_visible)
    `, [role_name, widget_key, is_visible ? 1 : 0]);

    res.json({ message: 'Permissions updated successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getWidgetPermissions, toggleWidgetVisibility };
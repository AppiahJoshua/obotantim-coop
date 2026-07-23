const pool = require('../config/database');

// Get visibility flags for all widgets across all roles
const getWidgetPermissions = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT role, widget_key, label, is_visible, allowed_roles FROM dashboard_permissions');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Toggle a specific widget's visibility for a specific role
const toggleWidgetVisibility = async (req, res, next) => {
  try {
    const { role, widget_key, label, is_visible, allowed_roles } = req.body;

    if (!role || !widget_key) {
      return res.status(400).json({ error: 'Role and widget_key are required.' });
    }

    const rolesJson = allowed_roles ? JSON.stringify(allowed_roles) : JSON.stringify([]);
    const widgetLabel = label || widget_key;
    const visibilityValue = (is_visible === true || is_visible === 1 || is_visible === '1' || is_visible === 'true') ? 1 : 0;

    // UPSERT scoped by both role and widget_key
    await pool.query(`
      INSERT INTO dashboard_permissions (role, widget_key, label, is_visible, allowed_roles)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        label = COALESCE(VALUES(label), label),
        is_visible = VALUES(is_visible),
        allowed_roles = VALUES(allowed_roles)
    `, [role, widget_key, widgetLabel, visibilityValue, rolesJson]);

    res.json({ message: 'Permissions updated successfully.', is_visible: visibilityValue });
  } catch (err) {
    next(err);
  }
};

module.exports = { getWidgetPermissions, toggleWidgetVisibility };

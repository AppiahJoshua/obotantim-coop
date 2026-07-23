const pool = require('../config/database');

// Get visibility flags for all widgets
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
    const { widget_key, label, is_visible, allowed_roles } = req.body;

    // Default allowed_roles to a valid empty JSON array string if not provided
    const rolesJson = allowed_roles ? JSON.stringify(allowed_roles) : JSON.stringify([]);

    // Fallback label if not explicitly provided in the payload
    const widgetLabel = label || widget_key;

    // Use an UPSERT statement including the required 'label' field
    await pool.query(`
      INSERT INTO dashboard_permissions (widget_key, label, is_visible, allowed_roles)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        label = COALESCE(VALUES(label), label),
        is_visible = VALUES(is_visible),
        allowed_roles = VALUES(allowed_roles)
    `, [widget_key, widgetLabel, is_visible ? 1 : 0, rolesJson]);

    res.json({ message: 'Permissions updated successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getWidgetPermissions, toggleWidgetVisibility };

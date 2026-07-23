const pool = require('../config/database');

// Get distinct roles available or used across permissions
const getRoles = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT allowed_roles FROM dashboard_permissions');
    
    // Extract unique roles across all widget JSON configurations
    const roleSet = new Set();
    rows.forEach(row => {
      try {
        const roles = typeof row.allowed_roles === 'string' 
          ? JSON.parse(row.allowed_roles) 
          : row.allowed_roles;
        if (Array.isArray(roles)) {
          roles.forEach(r => roleSet.add(r));
        }
      } catch (e) {
        // Ignore parse errors on individual row
      }
    });

    // Fallback defaults if no roles exist in DB yet
    if (roleSet.size === 0) {
      ['super_admin', 'admin', 'staff', 'member'].forEach(r => roleSet.add(r));
    }

    // Format into standard role objects expected by frontend selectors
    const rolesList = Array.from(roleSet).map(roleKey => ({
      id: roleKey,
      name: roleKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      label: roleKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));

    res.json(rolesList);
  } catch (err) {
    next(err);
  }
};

// Get visibility flags and allowed roles for all widgets
const getWidgetPermissions = async (req, res, next) => {
  try {
    // Querying 'allowed_roles' which matches your actual schema
    const [rows] = await pool.query(
      'SELECT widget_key, label, is_visible, allowed_roles FROM dashboard_permissions'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Toggle or update a specific widget's visibility and role access
const toggleWidgetVisibility = async (req, res, next) => {
  try {
    const { widget_key, label, is_visible, allowed_roles } = req.body;

    if (!widget_key) {
      return res.status(400).json({ error: 'widget_key is required.' });
    }

    const rolesJson = Array.isArray(allowed_roles)
      ? JSON.stringify(allowed_roles)
      : (allowed_roles ? JSON.stringify([allowed_roles]) : JSON.stringify([]));

    const widgetLabel = label || widget_key;
    const visibilityValue = (is_visible === true || is_visible === 1 || is_visible === '1' || is_visible === 'true') ? 1 : 0;

    // UPSERT scoped by widget_key
    await pool.query(`
      INSERT INTO dashboard_permissions (widget_key, label, is_visible, allowed_roles)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        label = COALESCE(VALUES(label), label),
        is_visible = VALUES(is_visible),
        allowed_roles = VALUES(allowed_roles)
    `, [widget_key, widgetLabel, visibilityValue, rolesJson]);

    res.json({ message: 'Permissions updated successfully.', is_visible: visibilityValue });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRoles, getWidgetPermissions, toggleWidgetVisibility };

const pool = require('../config/db'); // Adjust path if your DB config is located elsewhere

/**
 * Fetch all widget permissions matrix
 * GET /api/admin/permissions
 */
exports.getPermissions = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM permissions');
    
    // Parse allowed_roles JSON if stored as string in MySQL
    const permissions = rows.map((row) => ({
      ...row,
      is_visible: Boolean(row.is_visible),
      allowed_roles: typeof row.allowed_roles === 'string' 
        ? JSON.parse(row.allowed_roles) 
        : (row.allowed_roles || [])
    }));

    return res.json(permissions);
  } catch (err) {
    console.error('Error fetching permissions:', err);
    return res.status(500).json({ error: 'Database error fetching permissions' });
  }
};

/**
 * Toggle or update widget permission for roles
 * POST /api/admin/permissions/toggle
 */
exports.togglePermission = async (req, res) => {
  const { widget_key, label, is_visible, allowed_roles } = req.body;

  if (!widget_key) {
    return res.status(400).json({ error: 'widget_key is required' });
  }

  try {
    const rolesArray = Array.isArray(allowed_roles) ? allowed_roles : [];
    const rolesJson = JSON.stringify(rolesArray);
    const visibleFlag = is_visible ? 1 : 0;

    const query = `
      INSERT INTO permissions (widget_key, label, is_visible, allowed_roles)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        label = VALUES(label),
        is_visible = VALUES(is_visible),
        allowed_roles = VALUES(allowed_roles)
    `;

    await pool.query(query, [widget_key, label || widget_key, visibleFlag, rolesJson]);

    return res.json({
      widget_key,
      label: label || widget_key,
      is_visible: Boolean(is_visible),
      allowed_roles: rolesArray
    });
  } catch (err) {
    console.error('Error updating permissions:', err);
    return res.status(500).json({ error: 'Database error updating permissions' });
  }
};

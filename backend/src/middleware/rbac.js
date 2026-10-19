// Role-Based Access Control Middleware
// Roles: super_admin > manager > content_editor

const ROLE_HIERARCHY = {
  super_admin: 3,
  manager: 2,
  content_editor: 1,
};

// Require at least the specified role level
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions. You do not have access to this resource.',
      });
    }

    next();
  };
};

// Require minimum role level (includes all higher roles)
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const minLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < minLevel) {
      return res.status(403).json({
        error: 'Insufficient permissions. This action requires a higher role.',
      });
    }

    next();
  };
};

// Specific role guards (convenience wrappers)
const isSuperAdmin = requireRole('super_admin');
const isManagerOrAbove = requireMinRole('manager');
const isContentEditorOrAbove = requireMinRole('content_editor');

module.exports = {
  requireRole,
  requireMinRole,
  isSuperAdmin,
  isManagerOrAbove,
  isContentEditorOrAbove,
};

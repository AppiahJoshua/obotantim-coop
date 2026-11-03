const MODULES_BY_ROLE = {
  content_editor: ['dashboard', 'products', 'gallery', 'director', 'announcements'],
  manager: ['dashboard', 'registrations', 'messages', 'products', 'gallery', 'director', 'announcements'],
  super_admin: ['dashboard', 'registrations', 'messages', 'products', 'gallery', 'director', 'announcements'],
};

const parseDisabledModules = (value) => {
  if (Array.isArray(value)) return value.filter((module) => typeof module === 'string');
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((module) => typeof module === 'string') : [];
  } catch {
    return [];
  }
};

const hasModuleAccess = (user, moduleKey) => {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (!MODULES_BY_ROLE[user.role]?.includes(moduleKey)) return false;
  return !parseDisabledModules(user.disabled_modules).includes(moduleKey);
};

const requireModuleAccess = (moduleKey) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (!hasModuleAccess(req.user, moduleKey)) {
    return res.status(403).json({ error: 'Access to this dashboard section is disabled.' });
  }
  next();
};

module.exports = { MODULES_BY_ROLE, parseDisabledModules, hasModuleAccess, requireModuleAccess };
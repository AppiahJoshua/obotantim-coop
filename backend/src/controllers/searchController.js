const pool = require('../config/database');

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

const search = async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim().slice(0, 100);
    if (query.length < 2) return res.json({ results: [] });
    const pattern = `%${escapeLike(query)}%`;
    const canManage = ['manager', 'super_admin'].includes(req.user.role);
    const isSuperAdmin = req.user.role === 'super_admin';
    const tasks = [
      pool.query(
        'SELECT id, title, category FROM products WHERE title LIKE ? OR category LIKE ? ORDER BY title LIMIT 8',
        [pattern, pattern]
      ),
    ];

    if (canManage) {
      tasks.push(pool.query(
        'SELECT id, full_name AS label, phone AS detail FROM registrations WHERE full_name LIKE ? OR phone LIKE ? ORDER BY created_at DESC LIMIT 8',
        [pattern, pattern]
      ));
      tasks.push(pool.query(
        'SELECT id, name AS label, subject AS detail FROM contact_messages WHERE name LIKE ? OR subject LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT 8',
        [pattern, pattern, pattern]
      ));
    }
    if (isSuperAdmin) {
      tasks.push(pool.query(
        'SELECT id, name AS label, email AS detail FROM admin_users WHERE name LIKE ? OR email LIKE ? ORDER BY name LIMIT 8',
        [pattern, pattern]
      ));
    }

    const resultSets = await Promise.all(tasks);
    const results = [
      ...resultSets[0].rows.map((row) => ({ type: 'product', label: row.title, detail: row.category, url: '/admin/products' })),
    ];
    if (canManage) {
      results.push(...resultSets[1].rows.map((row) => ({
        type: 'registration', label: row.label, detail: row.detail, url: `/admin/registrations/${row.id}`,
      })));
      results.push(...resultSets[2].rows.map((row) => ({
        type: 'message', label: row.label, detail: row.detail, url: '/admin/messages',
      })));
    }
    if (isSuperAdmin) {
      const users = resultSets[resultSets.length - 1].rows;
      results.push(...users.map((row) => ({ type: 'staff', label: row.label, detail: row.detail, url: '/admin/users' })));
    }

    const pages = [
      ['Dashboard', '/admin', null], ['Registrations', '/admin/registrations', 'manager'],
      ['Messages', '/admin/messages', 'manager'], ['Products', '/admin/products', 'content_editor'],
      ['Gallery', '/admin/gallery', 'content_editor'], ['Director message', '/admin/director', 'content_editor'],
      ['Announcements', '/admin/announcements', 'content_editor'], ['User management', '/admin/users', 'super_admin'],
      ['Audit logs', '/admin/audit-logs', 'super_admin'], ['Profile & settings', '/admin/profile', null],
      ['Admin settings', '/admin/settings', 'super_admin'],
    ];
    const normalizedQuery = query.toLowerCase();
    const roleLevel = { content_editor: 1, manager: 2, super_admin: 3 }[req.user.role] || 0;
    results.push(...pages.filter(([label, , minRole]) =>
      label.toLowerCase().includes(normalizedQuery) && (!minRole || roleLevel >= roleLevelFor(minRole))
    ).map(([label, url]) => ({
      type: 'page', label, detail: 'Admin page', url,
    })));
    res.json({ results: results.slice(0, 25) });
  } catch (error) {
    next(error);
  }
};

const roleLevelFor = (role) => ({ content_editor: 1, manager: 2, super_admin: 3 }[role] || 0);

module.exports = { search };

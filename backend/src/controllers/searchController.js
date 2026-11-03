const pool = require('../config/database');
const { hasModuleAccess } = require('../utils/moduleAccess');

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

const search = async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim().slice(0, 100);
    if (query.length < 2) return res.json({ results: [] });
    const pattern = `%${escapeLike(query)}%`;
    const isSuperAdmin = req.user.role === 'super_admin';
    const canSearch = (module) => hasModuleAccess(req.user, module);
    const tasks = [];
    const taskIndexes = {};
    const addTask = (key, task) => {
      taskIndexes[key] = tasks.length;
      tasks.push(task);
    };

    if (canSearch('products')) addTask('products', pool.query(
        'SELECT id, title, category FROM products WHERE title LIKE ? OR category LIKE ? ORDER BY title LIMIT 8',
        [pattern, pattern]
    ));

    if (canSearch('registrations')) {
      addTask('registrations', pool.query(
        'SELECT id, full_name AS label, phone AS detail FROM registrations WHERE full_name LIKE ? OR phone LIKE ? ORDER BY created_at DESC LIMIT 8',
        [pattern, pattern]
      ));
    }
    if (canSearch('messages')) {
      addTask('messages', pool.query(
        'SELECT id, name AS label, subject AS detail FROM contact_messages WHERE name LIKE ? OR subject LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT 8',
        [pattern, pattern, pattern]
      ));
    }
    if (isSuperAdmin) {
      addTask('staff', pool.query(
        'SELECT id, name AS label, email AS detail FROM admin_users WHERE name LIKE ? OR email LIKE ? ORDER BY name LIMIT 8',
        [pattern, pattern]
      ));
    }

    const resultSets = await Promise.all(tasks);
    const rowsFor = (key) => taskIndexes[key] === undefined ? [] : resultSets[taskIndexes[key]].rows;
    const results = [];
    if (canSearch('products')) {
      results.push(...rowsFor('products').map((row) => ({
        type: 'product', label: row.title, detail: row.category, url: '/admin/products',
      })));
    }
    if (canSearch('registrations')) {
      results.push(...rowsFor('registrations').map((row) => ({
        type: 'registration', label: row.label, detail: row.detail, url: `/admin/registrations/${row.id}`,
      })));
    }
    if (canSearch('messages')) {
      results.push(...rowsFor('messages').map((row) => ({
        type: 'message', label: row.label, detail: row.detail, url: '/admin/messages',
      })));
    }
    if (isSuperAdmin) {
      results.push(...rowsFor('staff').map((row) => ({ type: 'staff', label: row.label, detail: row.detail, url: '/admin/users' })));
    }

    const pages = [
      ['Dashboard', '/admin', null, 'dashboard'], ['Registrations', '/admin/registrations', 'manager', 'registrations'],
      ['Messages', '/admin/messages', 'manager', 'messages'], ['Products', '/admin/products', 'content_editor', 'products'],
      ['Gallery', '/admin/gallery', 'content_editor', 'gallery'], ['Director message', '/admin/director', 'content_editor', 'director'],
      ['Announcements', '/admin/announcements', 'content_editor', 'announcements'], ['User management', '/admin/users', 'super_admin'],
      ['Audit logs', '/admin/audit-logs', 'super_admin'], ['Profile & settings', '/admin/profile', null],
      ['Admin settings', '/admin/settings', 'super_admin'],
    ];
    const normalizedQuery = query.toLowerCase();
    const roleLevel = { content_editor: 1, manager: 2, super_admin: 3 }[req.user.role] || 0;
    results.push(...pages.filter(([label, , minRole, module]) =>
      label.toLowerCase().includes(normalizedQuery)
      && (!minRole || roleLevel >= roleLevelFor(minRole))
      && (!module || canSearch(module))
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

const pool = require('../config/database');
const { sendCsv } = require('../utils/csv');

const parseDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : null;

const buildFilters = (query) => {
  const conditions = [];
  const params = [];
  const startDate = parseDate(query.startDate);
  const endDate = parseDate(query.endDate);
  const userId = Number.parseInt(query.userId, 10);
  const action = String(query.action || '').trim().slice(0, 100);
  const search = String(query.search || '').trim().slice(0, 100);

  if (startDate) { conditions.push('al.created_at >= ?'); params.push(`${startDate} 00:00:00`); }
  if (endDate) { conditions.push('al.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${endDate} 00:00:00`); }
  if (Number.isSafeInteger(userId) && userId > 0) { conditions.push('al.user_id = ?'); params.push(userId); }
  if (action) { conditions.push('al.action = ?'); params.push(action); }
  if (search) {
    conditions.push('(al.user_email LIKE ? OR u.name LIKE ? OR al.action LIKE ?)');
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    params.push(pattern, pattern, pattern);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};

const list = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
    const { where, params } = buildFilters(req.query);
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT al.*, u.name AS user_name FROM audit_logs al
         LEFT JOIN admin_users u ON u.id = al.user_id
         ${where} ORDER BY al.created_at DESC, al.id DESC LIMIT ? OFFSET ?`,
        [...params, limit, (page - 1) * limit]
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM audit_logs al LEFT JOIN admin_users u ON u.id = al.user_id ${where}`,
        params
      ),
    ]);
    const total = Number(count.rows[0].count);
    res.json({ data: rows.rows, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT u.id, u.name, u.email FROM audit_logs al JOIN admin_users u ON u.id = al.user_id ORDER BY u.name'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getActions = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
    res.json(result.rows.map((row) => row.action));
  } catch (error) {
    next(error);
  }
};

const exportCsv = async (req, res, next) => {
  try {
    const { where, params } = buildFilters(req.query);
    const result = await pool.query(
      `SELECT al.id, al.created_at, u.name AS user_name, al.user_email, al.user_role, al.action,
        al.resource, al.resource_id, al.ip_address
       FROM audit_logs al LEFT JOIN admin_users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC, al.id DESC LIMIT 10000`,
      params
    );
    sendCsv(res, 'audit-logs.csv', [
      ['id', 'ID'], ['created_at', 'Date'], ['user_name', 'User'], ['user_email', 'Email'],
      ['user_role', 'Role'], ['action', 'Action'], ['resource', 'Resource'],
      ['resource_id', 'Resource ID'], ['ip_address', 'IP address'],
    ], result.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getUsers, getActions, exportCsv, buildFilters };

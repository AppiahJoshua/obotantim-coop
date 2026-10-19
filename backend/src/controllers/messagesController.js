const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

// POST /api/messages — public
const send = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required.' });
    }
    await pool.query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES ($1,$2,$3,$4,$5)',
      [name, email, phone, subject, message]
    );
    res.status(201).json({ message: 'Message sent. We will get back to you soon.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/messages — admin
const getAll = async (req, res, next) => {
  try {
    const { resolved, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (resolved !== undefined) {
      conditions.push(`is_resolved = $${params.length + 1}`);
      params.push(resolved === 'true');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM contact_messages ${where}`, params),
    ]);

    res.json({
      data: rows.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(count.rows[0].count / limit),
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/messages/:id/reply — admin
const reply = async (req, res, next) => {
  try {
    const { reply: replyText } = req.body;
    if (!replyText) return res.status(400).json({ error: 'Reply text is required.' });

    const result = await pool.query(
      `UPDATE contact_messages SET
        reply = $1, replied_by = $2, replied_at = NOW(), is_resolved = true
       WHERE id = $3 RETURNING *`,
      [replyText, req.user.id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Message not found.' });
    await auditLog(req, 'REPLY_MESSAGE', 'contact_messages', req.params.id);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/messages/:id/resolve — admin
const resolve = async (req, res, next) => {
  try {
    const { is_resolved } = req.body;
    const result = await pool.query(
      'UPDATE contact_messages SET is_resolved = $1 WHERE id = $2 RETURNING *',
      [is_resolved, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Message not found.' });
    await auditLog(req, 'RESOLVE_MESSAGE', 'contact_messages', req.params.id);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { send, getAll, reply, resolve };

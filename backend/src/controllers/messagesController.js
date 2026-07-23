const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

// ── POST /api/messages (public) ───────────────────────────────
const send = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required.' });
    }

    await pool.query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, subject, message]
    );

    res.status(201).json({ message: 'Message sent. We will get back to you soon.' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/messages (admin) ─────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const { resolved, page = 1, limit = 20 } = req.query;
    const limitNum  = parseInt(limit)  || 20;
    const offsetNum = (parseInt(page) - 1) * limitNum;

    const conditions = [];
    const params     = [];

    if (resolved !== undefined) {
      conditions.push('is_resolved = ?');
      // req.query is always a string; convert 'true'/'false' to 1/0
      params.push(resolved === 'true' ? 1 : 0);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[rows], [countRows]] = await Promise.all([
      pool.query(
        `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limitNum, offsetNum]
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM contact_messages ${where}`,
        params
      ),
    ]);

    res.json({
      data:  rows,
      total: Number(countRows[0].total),
      page:  parseInt(page),
      pages: Math.ceil(Number(countRows[0].total) / limitNum),
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/messages/:id/reply (admin) ───────────────────────
const reply = async (req, res, next) => {
  try {
    const { reply: replyText } = req.body;
    if (!replyText) return res.status(400).json({ error: 'Reply text is required.' });

    const [result] = await pool.query(
      `UPDATE contact_messages
       SET reply = ?, replied_by = ?, replied_at = NOW(), is_resolved = 1
       WHERE id = ?`,
      [replyText, req.user.id, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    const [updated] = await pool.query(
      'SELECT * FROM contact_messages WHERE id = ?',
      [req.params.id]
    );

    await auditLog(req, 'REPLY_MESSAGE', 'contact_messages', req.params.id);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/messages/:id/resolve (admin) ─────────────────────
const resolve = async (req, res, next) => {
  try {
    const { is_resolved } = req.body;

    const [result] = await pool.query(
      'UPDATE contact_messages SET is_resolved = ? WHERE id = ?',
      [is_resolved ? 1 : 0, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    const [updated] = await pool.query(
      'SELECT * FROM contact_messages WHERE id = ?',
      [req.params.id]
    );

    await auditLog(req, 'RESOLVE_MESSAGE', 'contact_messages', req.params.id);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { send, getAll, reply, resolve };
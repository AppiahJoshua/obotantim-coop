const pool = require('../config/database');
const auditLog = require('../utils/auditLog');
const { safelyEnqueueEmail, safelyNotifyStaff } = require('../utils/notifications');

// POST /api/messages — public
const send = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required.' });
    }
    const result = await pool.query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?,?,?,?,?)',
      [name, email, phone, subject, message]
    );
    await Promise.all([
      safelyNotifyStaff({
        eventType: 'contact_message.created',
        title: 'New contact message',
        body: `${name} sent a new contact message${subject ? `: ${subject}` : '.'}`,
        entityType: 'contact_message',
        entityId: result.insertId,
        actionUrl: '/admin/messages',
      }),
      safelyEnqueueEmail({
        recipientEmail: email,
        subject: 'We received your message',
        templateName: 'submission_receipt',
        payload: { name, submissionType: 'message' },
      }),
    ]).catch((error) => console.error('Message side effects failed:', error.message));
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
      conditions.push('is_resolved = ?');
      params.push(resolved === 'true');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) AS count FROM contact_messages ${where}`, params),
    ]);

    res.json({
      data: rows.rows,
      total: parseInt(count.rows[0].count, 10),
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

    await pool.query(
      `UPDATE contact_messages SET
        reply = ?, replied_by = ?, replied_at = NOW(), is_resolved = true
       WHERE id = ?`,
      [replyText, req.user.id, req.params.id]
    );
    const result = await pool.query('SELECT * FROM contact_messages WHERE id = ?', [req.params.id]);
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
    await pool.query(
      'UPDATE contact_messages SET is_resolved = ? WHERE id = ?',
      [is_resolved, req.params.id]
    );
    const result = await pool.query('SELECT * FROM contact_messages WHERE id = ?', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Message not found.' });
    await auditLog(req, 'RESOLVE_MESSAGE', 'contact_messages', req.params.id);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { send, getAll, reply, resolve };

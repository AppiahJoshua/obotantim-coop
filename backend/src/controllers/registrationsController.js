const pool = require('../config/database');
const auditLog = require('../utils/auditLog');
const { safelyEnqueueEmail, safelyNotifyStaff } = require('../utils/notifications');
const crypto = require('crypto');
const { safelyEnqueueSms } = require('../utils/sms');

// POST /api/registrations — public submission
const submit = async (req, res, next) => {
  try {
    const {
      full_name, phone, email, ghana_card, occupation,
      address, service_type, loan_amount, notes,
    } = req.body;

    if (!full_name || !phone || !service_type) {
      return res.status(400).json({ error: 'Full name, phone, and service type are required.' });
    }

    const validServices = ['loan', 'savings', 'membership'];
    if (!validServices.includes(service_type)) {
      return res.status(400).json({ error: 'Invalid service type.' });
    }

    const photo_url = req.file ? req.file.path : null;
    const photo_public_id = req.file ? req.file.filename : null;
    const tracking_code = crypto.randomBytes(16).toString('hex');

    const result = await pool.query(
      `INSERT INTO registrations
        (tracking_code, full_name, phone, email, ghana_card, occupation, address, service_type, loan_amount, notes, photo_url, photo_public_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tracking_code, full_name, phone, email, ghana_card, occupation, address, service_type,
       loan_amount || null, notes, photo_url, photo_public_id]
    );

    await Promise.all([
      safelyNotifyStaff({
        eventType: 'registration.created',
        title: 'New registration received',
        body: `${full_name} submitted a ${service_type} registration.`,
        entityType: 'registration',
        entityId: result.insertId,
        actionUrl: `/admin/registrations/${result.insertId}`,
      }),
      safelyEnqueueEmail({
        recipientEmail: email,
        subject: 'We received your registration',
        templateName: 'submission_receipt',
        payload: { name: full_name, submissionType: 'registration' },
      }),
      safelyEnqueueSms(phone, `Obotantim Cooperative: application received. Track securely at ${process.env.FRONTEND_URL || 'http://localhost:5173'}/track-application using reference ${tracking_code} and your phone number.`),
    ]).catch((error) => console.error('Registration side effects failed:', error.message));

    res.status(201).json({
      message: 'Registration submitted successfully. Our team will contact you shortly.',
      registration: {
        id: result.insertId,
        tracking_code,
        full_name,
        service_type,
        created_at: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/registrations — admin
const getAll = async (req, res, next) => {
  try {
    const { status, service_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (status) { conditions.push('r.status = ?'); params.push(status); }
    if (service_type) { conditions.push('r.service_type = ?'); params.push(service_type); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT r.*, u.name as reviewed_by_name FROM registrations r
         LEFT JOIN admin_users u ON r.reviewed_by = u.id
         ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) AS count FROM registrations r ${where}`, params),
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

// GET /api/registrations/:id — admin
const getById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as reviewed_by_name FROM registrations r
       LEFT JOIN admin_users u ON r.reviewed_by = u.id
      WHERE r.id = ?`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Registration not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/registrations/:id/status — admin
const updateStatus = async (req, res, next) => {
  try {
    const { status, status_note } = req.body;
    const validStatuses = ['new', 'contacted', 'approved', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    await pool.query(
      `UPDATE registrations SET
        status = ?, status_note = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [status, status_note, req.user.id, req.params.id]
    );
    const result = await pool.query('SELECT * FROM registrations WHERE id = ?', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Registration not found.' });

    await auditLog(req, 'UPDATE_REGISTRATION_STATUS', 'registrations', req.params.id, { status });
    await safelyEnqueueSms(
      result.rows[0].phone,
      `Obotantim Cooperative: your ${result.rows[0].service_type} application status is now ${status}.`
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { submit, getAll, getById, updateStatus };

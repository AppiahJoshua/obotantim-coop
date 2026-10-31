const pool = require('../config/database');
const { sendCsv } = require('../utils/csv');

const exportRegistrations = async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.status) { conditions.push('status = ?'); params.push(String(req.query.status).slice(0, 20)); }
    if (req.query.service_type) { conditions.push('service_type = ?'); params.push(String(req.query.service_type).slice(0, 50)); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id, full_name, phone, email, service_type, loan_amount, status, status_note, created_at, reviewed_at
       FROM registrations ${where} ORDER BY created_at DESC LIMIT 50000`,
      params
    );
    sendCsv(res, 'registrations.csv', [
      ['id', 'ID'], ['full_name', 'Full name'], ['phone', 'Phone'], ['email', 'Email'],
      ['service_type', 'Service'], ['loan_amount', 'Loan amount'], ['status', 'Status'],
      ['status_note', 'Status note'], ['created_at', 'Submitted at'], ['reviewed_at', 'Reviewed at'],
    ], result.rows);
  } catch (error) { next(error); }
};

const exportMessages = async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.resolved === 'true' || req.query.resolved === 'false') {
      conditions.push('is_resolved = ?');
      params.push(req.query.resolved === 'true');
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id, name, email, phone, subject, message, is_resolved, reply, created_at, replied_at
       FROM contact_messages ${where} ORDER BY created_at DESC LIMIT 50000`,
      params
    );
    sendCsv(res, 'contact-messages.csv', [
      ['id', 'ID'], ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['subject', 'Subject'],
      ['message', 'Message'], ['is_resolved', 'Resolved'], ['reply', 'Reply'],
      ['created_at', 'Received at'], ['replied_at', 'Replied at'],
    ], result.rows);
  } catch (error) { next(error); }
};

module.exports = { exportRegistrations, exportMessages };

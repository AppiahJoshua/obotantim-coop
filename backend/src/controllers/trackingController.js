const pool = require('../config/database');

const track = async (req, res, next) => {
  try {
    const trackingCode = String(req.body?.trackingCode || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').replace(/[\s()-]/g, '');
    if (!/^[a-f0-9]{32}$/.test(trackingCode) || !/^\+?[0-9]{9,15}$/.test(phone)) {
      return res.status(404).json({ error: 'We could not find an application matching those details.' });
    }
    const result = await pool.query(
      `SELECT tracking_code, service_type, status, created_at, updated_at
       FROM registrations WHERE tracking_code = ? AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') = REPLACE(?, '+', '')
       LIMIT 1`,
      [trackingCode, phone]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'We could not find an application matching those details.' });
    res.json({ application: result.rows[0] });
  } catch (error) { next(error); }
};

const updateContact = async (req, res, next) => {
  try {
    const trackingCode = String(req.body?.trackingCode || '').trim().toLowerCase();
    const currentPhone = String(req.body?.phone || '').replace(/[\s()-]/g, '');
    const newPhone = String(req.body?.newPhone || currentPhone).replace(/[\s()-]/g, '');
    const email = String(req.body?.email || '').trim().toLowerCase() || null;
    if (!/^[a-f0-9]{32}$/.test(trackingCode) || !/^\+?[0-9]{9,15}$/.test(currentPhone)
      || !/^\+?[0-9]{9,15}$/.test(newPhone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return res.status(404).json({ error: 'We could not verify this application.' });
    }
    const result = await pool.query(
      `UPDATE registrations SET phone = ?, email = COALESCE(?, email), updated_at = NOW()
       WHERE tracking_code = ? AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') = REPLACE(?, '+', '')`,
      [newPhone, email, trackingCode, currentPhone]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'We could not verify this application.' });
    res.json({ message: 'Contact details updated.' });
  } catch (error) { next(error); }
};

module.exports = { track, updateContact };

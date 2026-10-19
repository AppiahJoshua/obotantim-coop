const pool = require('../config/database');
const { deleteFromCloudinary } = require('../middleware/upload');
const auditLog = require('../utils/auditLog');

// GET /api/gallery — public
const getAll = async (req, res, next) => {
  try {
    const isAdmin = req.user !== undefined;
    const query = isAdmin
      ? 'SELECT * FROM gallery ORDER BY sort_order ASC, created_at DESC'
      : 'SELECT * FROM gallery WHERE is_active = true ORDER BY sort_order ASC, created_at DESC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/gallery — admin (with file upload)
const upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }
    const { caption, category, sort_order } = req.body;
    const result = await pool.query(
      `INSERT INTO gallery (caption, image_url, public_id, category, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [caption, req.file.path, req.file.filename, category || 'general', sort_order || 0]
    );
    await auditLog(req, 'UPLOAD_GALLERY', 'gallery', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/gallery/:id — admin
const update = async (req, res, next) => {
  try {
    const { caption, category, is_active, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE gallery SET
        caption = COALESCE($1, caption),
        category = COALESCE($2, category),
        is_active = COALESCE($3, is_active),
        sort_order = COALESCE($4, sort_order)
       WHERE id = $5 RETURNING *`,
      [caption, category, is_active, sort_order, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Gallery item not found.' });
    await auditLog(req, 'UPDATE_GALLERY', 'gallery', req.params.id);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/gallery/:id — admin
const remove = async (req, res, next) => {
  try {
    const existing = await pool.query('SELECT * FROM gallery WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Gallery item not found.' });

    // Delete from Cloudinary
    if (existing.rows[0].public_id) {
      await deleteFromCloudinary(existing.rows[0].public_id);
    }

    await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
    await auditLog(req, 'DELETE_GALLERY', 'gallery', req.params.id);
    res.json({ message: 'Gallery image deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, upload, update, remove };

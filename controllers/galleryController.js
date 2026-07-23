const pool = require('../config/database');
const { deleteFromCloudinary } = require('../middleware/upload');
const auditLog = require('../utils/auditLog');

// ── GET /api/gallery ──────────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const isAdmin = req.user !== undefined;
    const sql = isAdmin
      ? 'SELECT * FROM gallery ORDER BY sort_order ASC, created_at DESC'
      : 'SELECT * FROM gallery WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC';

    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/gallery ─────────────────────────────────────────
const upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }

    const { caption, category, sort_order } = req.body;

    const [result] = await pool.query(
      `INSERT INTO gallery (caption, image_url, public_id, category, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [
        caption || '', 
        req.file.path, 
        req.file.filename, 
        category || 'general', 
        sort_order ? parseInt(sort_order, 10) : 0
      ]
    );

    const [newRows] = await pool.query(
      'SELECT * FROM gallery WHERE id = ?',
      [result.insertId]
    );

    await auditLog(req, 'UPLOAD_GALLERY', 'gallery', result.insertId);
    res.status(201).json(newRows[0]);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/gallery/:id ──────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const { caption, category, is_active, sort_order } = req.body;

    // Fetch existing record to safely handle partial updates without overwriting with nulls
    const [existing] = await pool.query('SELECT * FROM gallery WHERE id = ?', [req.params.id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Gallery item not found.' });
    }

    const current = existing[0];
    const updatedCaption = caption !== undefined ? caption : current.caption;
    const updatedCategory = category !== undefined ? category : current.category;
    const updatedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : current.is_active;
    const updatedSortOrder = sort_order !== undefined ? parseInt(sort_order, 10) : current.sort_order;

    await pool.query(
      `UPDATE gallery SET
         caption = ?,
         category = ?,
         is_active = ?,
         sort_order = ?
       WHERE id = ?`,
      [updatedCaption, updatedCategory, updatedIsActive, updatedSortOrder, req.params.id]
    );

    const [updated] = await pool.query(
      'SELECT * FROM gallery WHERE id = ?',
      [req.params.id]
    );

    await auditLog(req, 'UPDATE_GALLERY', 'gallery', req.params.id);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/gallery/:id ───────────────────────────────────
const remove = async (req, res, next) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM gallery WHERE id = ?',
      [req.params.id]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Gallery item not found.' });

    // Remove from Cloudinary first
    if (existing[0].public_id) {
      await deleteFromCloudinary(existing[0].public_id);
    }

    await pool.query('DELETE FROM gallery WHERE id = ?', [req.params.id]);
    await auditLog(req, 'DELETE_GALLERY', 'gallery', req.params.id);
    res.json({ message: 'Gallery image deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, upload, update, remove };

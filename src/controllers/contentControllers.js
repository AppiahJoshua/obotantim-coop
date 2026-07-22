const pool = require('../config/database');
const { deleteFromCloudinary } = require('../middleware/upload');
const auditLog = require('../utils/auditLog');

// ════════════════════════════════════════════════════════════════
// Director's Message
// ════════════════════════════════════════════════════════════════
const directorController = {

  // GET /api/director
  get: async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM director_message ORDER BY id DESC LIMIT 1'
      );
      res.json(rows[0] || null);
    } catch (err) { next(err); }
  },

  // PUT /api/director
  update: async (req, res, next) => {
    try {
      const { director_name, title, message } = req.body;
      const photo_url = req.file ? req.file.path     : null;
      const public_id = req.file ? req.file.filename : null;

      const [existing] = await pool.query(
        'SELECT * FROM director_message ORDER BY id DESC LIMIT 1'
      );

      if (!existing[0]) {
        // No record yet — insert first one
        const [result] = await pool.query(
          'INSERT INTO director_message (director_name, title, message, photo_url, public_id) VALUES (?, ?, ?, ?, ?)',
          [director_name, title, message, photo_url, public_id]
        );
        const [newRows] = await pool.query(
          'SELECT * FROM director_message WHERE id = ?',
          [result.insertId]
        );
        return res.json(newRows[0]);
      }

      // Delete old Cloudinary image if a new one was uploaded
      if (photo_url && existing[0].public_id) {
        await deleteFromCloudinary(existing[0].public_id);
      }

      await pool.query(
        `UPDATE director_message SET
           director_name = COALESCE(?, director_name),
           title         = COALESCE(?, title),
           message       = COALESCE(?, message),
           photo_url     = COALESCE(?, photo_url),
           public_id     = COALESCE(?, public_id),
           updated_at    = NOW()
         WHERE id = ?`,
        [director_name, title, message, photo_url, public_id, existing[0].id]
      );

      const [updated] = await pool.query(
        'SELECT * FROM director_message WHERE id = ?',
        [existing[0].id]
      );

      await auditLog(req, 'UPDATE_DIRECTOR_MESSAGE', 'director_message', existing[0].id);
      res.json(updated[0]);
    } catch (err) { next(err); }
  },
};

// ════════════════════════════════════════════════════════════════
// Testimonials
// ════════════════════════════════════════════════════════════════
const testimonialsController = {

  getAll: async (req, res, next) => {
    try {
      const isAdmin = !!req.user;
      const sql = isAdmin
        ? 'SELECT * FROM testimonials ORDER BY sort_order ASC, created_at DESC'
        : 'SELECT * FROM testimonials WHERE is_active = 1 ORDER BY sort_order ASC';

      const [rows] = await pool.query(sql);
      res.json(rows);
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const { name, location, message, sort_order } = req.body;
      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required.' });
      }

      const photo_url = req.file ? req.file.path     : null;
      const public_id = req.file ? req.file.filename : null;

      const [result] = await pool.query(
        'INSERT INTO testimonials (name, location, message, photo_url, public_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [name, location, message, photo_url, public_id, sort_order || 0]
      );

      const [newRows] = await pool.query(
        'SELECT * FROM testimonials WHERE id = ?',
        [result.insertId]
      );
      res.status(201).json(newRows[0]);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const { name, location, message, is_active, sort_order } = req.body;
      const isActiveVal = is_active !== undefined ? (is_active ? 1 : 0) : null;

      const [result] = await pool.query(
        `UPDATE testimonials SET
           name       = COALESCE(?, name),
           location   = COALESCE(?, location),
           message    = COALESCE(?, message),
           is_active  = COALESCE(?, is_active),
           sort_order = COALESCE(?, sort_order)
         WHERE id = ?`,
        [name, location, message, isActiveVal, sort_order, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Testimonial not found.' });
      }

      const [updated] = await pool.query(
        'SELECT * FROM testimonials WHERE id = ?',
        [req.params.id]
      );
      res.json(updated[0]);
    } catch (err) { next(err); }
  },

  remove: async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        'SELECT public_id FROM testimonials WHERE id = ?',
        [req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Testimonial not found.' });

      if (rows[0].public_id) await deleteFromCloudinary(rows[0].public_id);

      await pool.query('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
      res.json({ message: 'Testimonial deleted.' });
    } catch (err) { next(err); }
  },
};

// ════════════════════════════════════════════════════════════════
// Announcements
// ════════════════════════════════════════════════════════════════
const announcementsController = {

  getAll: async (req, res, next) => {
    try {
      const isAdmin = !!req.user;
      const sql = isAdmin
        ? `SELECT a.*, u.name AS author
           FROM announcements a
           LEFT JOIN admin_users u ON a.created_by = u.id
           ORDER BY a.created_at DESC`
        : `SELECT * FROM announcements
           WHERE is_published = 1
           ORDER BY published_at DESC
           LIMIT 10`;

      const [rows] = await pool.query(sql);
      res.json(rows);
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const { title, content, is_published } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required.' });
      }

      const published_at   = is_published ? new Date() : null;
      const isPublishedVal = is_published ? 1 : 0;

      const [result] = await pool.query(
        'INSERT INTO announcements (title, content, is_published, published_at, created_by) VALUES (?, ?, ?, ?, ?)',
        [title, content, isPublishedVal, published_at, req.user.id]
      );

      const [newRows] = await pool.query(
        'SELECT * FROM announcements WHERE id = ?',
        [result.insertId]
      );

      await auditLog(req, 'CREATE_ANNOUNCEMENT', 'announcements', result.insertId);
      res.status(201).json(newRows[0]);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const { title, content, is_published } = req.body;

      const [existing] = await pool.query(
        'SELECT * FROM announcements WHERE id = ?',
        [req.params.id]
      );
      if (!existing[0]) return res.status(404).json({ error: 'Announcement not found.' });

      // Set published_at only on first publish
      const alreadyPublished = existing[0].is_published === 1;
      const published_at     = is_published && !alreadyPublished
        ? new Date()
        : existing[0].published_at;

      const isPublishedVal = is_published !== undefined ? (is_published ? 1 : 0) : null;

      await pool.query(
        `UPDATE announcements SET
           title        = COALESCE(?, title),
           content      = COALESCE(?, content),
           is_published = COALESCE(?, is_published),
           published_at = ?,
           updated_at   = NOW()
         WHERE id = ?`,
        [title, content, isPublishedVal, published_at, req.params.id]
      );

      const [updated] = await pool.query(
        'SELECT * FROM announcements WHERE id = ?',
        [req.params.id]
      );

      await auditLog(req, 'UPDATE_ANNOUNCEMENT', 'announcements', req.params.id);
      res.json(updated[0]);
    } catch (err) { next(err); }
  },

  remove: async (req, res, next) => {
    try {
      const [result] = await pool.query(
        'DELETE FROM announcements WHERE id = ?',
        [req.params.id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Announcement not found.' });
      }

      await auditLog(req, 'DELETE_ANNOUNCEMENT', 'announcements', req.params.id);
      res.json({ message: 'Announcement deleted.' });
    } catch (err) { next(err); }
  },
};

module.exports = { directorController, testimonialsController, announcementsController };
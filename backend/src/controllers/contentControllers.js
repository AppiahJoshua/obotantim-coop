// directorController.js
const pool = require('../config/database');
const { deleteFromCloudinary } = require('../middleware/upload');
const auditLog = require('../utils/auditLog');

const directorController = {
  // GET /api/director — public
  get: async (req, res, next) => {
    try {
      const result = await pool.query('SELECT * FROM director_message ORDER BY id DESC LIMIT 1');
      res.json(result.rows[0] || null);
    } catch (err) { next(err); }
  },

  // PUT /api/director — admin (content_editor+)
  update: async (req, res, next) => {
    try {
      const { director_name, title, message } = req.body;
      const photo_url = req.file ? req.file.path : undefined;
      const public_id = req.file ? req.file.filename : undefined;

      // Get existing
      const existing = await pool.query('SELECT * FROM director_message ORDER BY id DESC LIMIT 1');

      if (!existing.rows[0]) {
        // Insert first record
        const result = await pool.query(
          'INSERT INTO director_message (director_name, title, message, photo_url, public_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
          [director_name, title, message, photo_url, public_id]
        );
        return res.json(result.rows[0]);
      }

      // Delete old image if new one uploaded
      if (photo_url && existing.rows[0].public_id) {
        await deleteFromCloudinary(existing.rows[0].public_id);
      }

      const result = await pool.query(
        `UPDATE director_message SET
          director_name = COALESCE($1, director_name),
          title = COALESCE($2, title),
          message = COALESCE($3, message),
          photo_url = COALESCE($4, photo_url),
          public_id = COALESCE($5, public_id),
          updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [director_name, title, message, photo_url, public_id, existing.rows[0].id]
      );
      await auditLog(req, 'UPDATE_DIRECTOR_MESSAGE', 'director_message', existing.rows[0].id);
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  },
};

// testimonialsController
const testimonialsController = {
  getAll: async (req, res, next) => {
    try {
      const isAdmin = !!req.user;
      const q = isAdmin
        ? 'SELECT * FROM testimonials ORDER BY sort_order ASC, created_at DESC'
        : 'SELECT * FROM testimonials WHERE is_active=true ORDER BY sort_order ASC';
      const result = await pool.query(q);
      res.json(result.rows);
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const { name, location, message, sort_order } = req.body;
      if (!name || !message) return res.status(400).json({ error: 'Name and message required.' });
      const photo_url = req.file ? req.file.path : null;
      const public_id = req.file ? req.file.filename : null;
      const result = await pool.query(
        'INSERT INTO testimonials (name, location, message, photo_url, public_id, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [name, location, message, photo_url, public_id, sort_order || 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const { name, location, message, is_active, sort_order } = req.body;
      const result = await pool.query(
        `UPDATE testimonials SET
          name=COALESCE($1,name), location=COALESCE($2,location), message=COALESCE($3,message),
          is_active=COALESCE($4,is_active), sort_order=COALESCE($5,sort_order)
         WHERE id=$6 RETURNING *`,
        [name, location, message, is_active, sort_order, req.params.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Testimonial not found.' });
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  },

  remove: async (req, res, next) => {
    try {
      const row = await pool.query('SELECT public_id FROM testimonials WHERE id=$1', [req.params.id]);
      if (!row.rows[0]) return res.status(404).json({ error: 'Testimonial not found.' });
      if (row.rows[0].public_id) await deleteFromCloudinary(row.rows[0].public_id);
      await pool.query('DELETE FROM testimonials WHERE id=$1', [req.params.id]);
      res.json({ message: 'Testimonial deleted.' });
    } catch (err) { next(err); }
  },
};

// announcementsController
const announcementsController = {
  getAll: async (req, res, next) => {
    try {
      const isAdmin = !!req.user;
      const q = isAdmin
        ? 'SELECT a.*, u.name as author FROM announcements a LEFT JOIN admin_users u ON a.created_by=u.id ORDER BY a.created_at DESC'
        : 'SELECT * FROM announcements WHERE is_published=true ORDER BY published_at DESC LIMIT 10';
      const result = await pool.query(q);
      res.json(result.rows);
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const { title, content, is_published } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });
      const published_at = is_published ? new Date() : null;
      const result = await pool.query(
        'INSERT INTO announcements (title, content, is_published, published_at, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [title, content, !!is_published, published_at, req.user.id]
      );
      await auditLog(req, 'CREATE_ANNOUNCEMENT', 'announcements', result.rows[0].id);
      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const { title, content, is_published } = req.body;
      const existing = await pool.query('SELECT * FROM announcements WHERE id=$1', [req.params.id]);
      if (!existing.rows[0]) return res.status(404).json({ error: 'Announcement not found.' });

      const published_at = is_published && !existing.rows[0].is_published ? new Date() : existing.rows[0].published_at;
      const result = await pool.query(
        `UPDATE announcements SET
          title=COALESCE($1,title), content=COALESCE($2,content),
          is_published=COALESCE($3,is_published), published_at=$4, updated_at=NOW()
         WHERE id=$5 RETURNING *`,
        [title, content, is_published, published_at, req.params.id]
      );
      await auditLog(req, 'UPDATE_ANNOUNCEMENT', 'announcements', req.params.id);
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  },

  remove: async (req, res, next) => {
    try {
      const result = await pool.query('DELETE FROM announcements WHERE id=$1 RETURNING id', [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Announcement not found.' });
      await auditLog(req, 'DELETE_ANNOUNCEMENT', 'announcements', req.params.id);
      res.json({ message: 'Announcement deleted.' });
    } catch (err) { next(err); }
  },
};

module.exports = { directorController, testimonialsController, announcementsController };

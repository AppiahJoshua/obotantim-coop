const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

// ── GET /api/products ─────────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    // 'all' or 'false' → show everything (admin); otherwise active only (public)
    const activeOnly = !['false', 'all'].includes(req.query.active);
    const sql = activeOnly
      ? 'SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC'
      : 'SELECT * FROM products ORDER BY sort_order ASC, created_at ASC';

    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/products/:id ─────────────────────────────────────
const getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/products ────────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const { category, title, description, icon, interest_rate, sort_order } = req.body;
    if (!category || !title) {
      return res.status(400).json({ error: 'Category and title are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO products (category, title, description, icon, interest_rate, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [category, title, description, icon || 'coins', interest_rate, sort_order || 0]
    );

    const [newRows] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );

    await auditLog(req, 'CREATE_PRODUCT', 'products', result.insertId, { title });
    res.status(201).json(newRows[0]);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/products/:id ─────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const { category, title, description, icon, interest_rate, is_active, sort_order } = req.body;

    // Resolve is_active: undefined → null (COALESCE keeps current), true/false → 1/0
    const isActiveVal = is_active !== undefined ? (is_active ? 1 : 0) : null;

    const [result] = await pool.query(
      `UPDATE products SET
         category      = COALESCE(?, category),
         title         = COALESCE(?, title),
         description   = COALESCE(?, description),
         icon          = COALESCE(?, icon),
         interest_rate = COALESCE(?, interest_rate),
         is_active     = COALESCE(?, is_active),
         sort_order    = COALESCE(?, sort_order),
         updated_at    = NOW()
       WHERE id = ?`,
      [category, title, description, icon, interest_rate, isActiveVal, sort_order, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const [updated] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    await auditLog(req, 'UPDATE_PRODUCT', 'products', req.params.id);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/products/:id ──────────────────────────────────
const remove = async (req, res, next) => {
  try {
    // Fetch before delete so we can log the title
    const [existing] = await pool.query(
      'SELECT id, title FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Product not found.' });

    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);

    await auditLog(req, 'DELETE_PRODUCT', 'products', req.params.id, {
      title: existing[0].title,
    });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
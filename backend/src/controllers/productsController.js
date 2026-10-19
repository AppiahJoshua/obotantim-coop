const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

// GET /api/products — public
const getAll = async (req, res, next) => {
  try {
    const activeOnly = !['false', 'all'].includes(req.query.active);
    const query = activeOnly
      ? 'SELECT * FROM products WHERE is_active = true ORDER BY sort_order ASC, created_at ASC'
      : 'SELECT * FROM products ORDER BY sort_order ASC, created_at ASC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
const getById = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/products — admin
const create = async (req, res, next) => {
  try {
    const { category, title, description, icon, interest_rate, sort_order } = req.body;
    if (!category || !title) {
      return res.status(400).json({ error: 'Category and title are required.' });
    }
    const result = await pool.query(
      `INSERT INTO products (category, title, description, icon, interest_rate, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [category, title, description, icon || 'coins', interest_rate, sort_order || 0]
    );
    await auditLog(req, 'CREATE_PRODUCT', 'products', result.rows[0].id, { title });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id — admin
const update = async (req, res, next) => {
  try {
    const { category, title, description, icon, interest_rate, is_active, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE products SET
        category = COALESCE($1, category),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        icon = COALESCE($4, icon),
        interest_rate = COALESCE($5, interest_rate),
        is_active = COALESCE($6, is_active),
        sort_order = COALESCE($7, sort_order),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [category, title, description, icon, interest_rate, is_active, sort_order, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found.' });
    await auditLog(req, 'UPDATE_PRODUCT', 'products', result.rows[0].id);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id — admin
const remove = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id, title', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found.' });
    await auditLog(req, 'DELETE_PRODUCT', 'products', req.params.id, { title: result.rows[0].title });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };

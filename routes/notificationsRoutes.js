const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isManagerOrAbove } = require('../middleware/rbac');

// GET: Fetch all admin notifications (latest first)
router.get('/', authenticate, isManagerOrAbove, async (req, res, next) => {
  try {
    const [notifications] = await pool.query(
      `SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50`
    );
    res.json(notifications);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.warn('admin_notifications table missing; returning empty array.');
      return res.json([]);
    }
    console.error('Error fetching notifications:', error);
    next(error);
  }
});

// PUT: Mark all notifications as read (PLACED BEFORE /:id/read)
router.put('/mark-all-read', authenticate, isManagerOrAbove, async (req, res, next) => {
  try {
    await pool.query(`UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0`);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    next(error);
  }
});

// PUT: Mark a specific notification as read
router.put('/:id/read', authenticate, isManagerOrAbove, async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE admin_notifications SET is_read = 1 WHERE id = ?`,
      [id]
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    next(error);
  }
});

module.exports = router;

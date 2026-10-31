const express = require('express');
const controller = require('../controllers/notificationsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.get('/preferences', controller.getPreferences);
router.put('/preferences', controller.updatePreferences);
router.get('/', controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);

module.exports = router;
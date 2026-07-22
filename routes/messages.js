const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/messagesController');
const { authenticate } = require('../middleware/auth');
const { isManagerOrAbove } = require('../middleware/rbac');

router.post('/', ctrl.send);
router.get('/', authenticate, isManagerOrAbove, ctrl.getAll);
router.put('/:id/reply', authenticate, isManagerOrAbove, ctrl.reply);
router.put('/:id/resolve', authenticate, isManagerOrAbove, ctrl.resolve);

module.exports = router;

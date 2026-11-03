const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/messagesController');
const { authenticate } = require('../middleware/auth');
const { isManagerOrAbove } = require('../middleware/rbac');
const { requireModuleAccess } = require('../utils/moduleAccess');

router.post('/', ctrl.send);
router.get('/', authenticate, isManagerOrAbove, requireModuleAccess('messages'), ctrl.getAll);
router.put('/:id/reply', authenticate, isManagerOrAbove, requireModuleAccess('messages'), ctrl.reply);
router.put('/:id/resolve', authenticate, isManagerOrAbove, requireModuleAccess('messages'), ctrl.resolve);

module.exports = router;

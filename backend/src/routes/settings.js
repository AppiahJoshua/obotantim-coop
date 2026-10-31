const express = require('express');
const controller = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate, isSuperAdmin);
router.get('/', controller.getSettings);
router.put('/', controller.updateSettings);

module.exports = router;

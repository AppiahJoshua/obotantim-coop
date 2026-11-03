const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/registrationsController');
const { authenticate } = require('../middleware/auth');
const { isManagerOrAbove } = require('../middleware/rbac');
const { uploadRegistration } = require('../middleware/upload');
const { requireModuleAccess } = require('../utils/moduleAccess');

// Public
router.post('/', uploadRegistration.single('photo'), ctrl.submit);

// Admin
router.get('/', authenticate, isManagerOrAbove, requireModuleAccess('registrations'), ctrl.getAll);
router.get('/:id', authenticate, isManagerOrAbove, requireModuleAccess('registrations'), ctrl.getById);
router.put('/:id/status', authenticate, isManagerOrAbove, requireModuleAccess('registrations'), ctrl.updateStatus);

module.exports = router;

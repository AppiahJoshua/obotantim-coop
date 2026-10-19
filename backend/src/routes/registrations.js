const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/registrationsController');
const { authenticate } = require('../middleware/auth');
const { isManagerOrAbove } = require('../middleware/rbac');
const { uploadRegistration } = require('../middleware/upload');

// Public
router.post('/', uploadRegistration.single('photo'), ctrl.submit);

// Admin
router.get('/', authenticate, isManagerOrAbove, ctrl.getAll);
router.get('/:id', authenticate, isManagerOrAbove, ctrl.getById);
router.put('/:id/status', authenticate, isManagerOrAbove, ctrl.updateStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/registrationsController');
const { authenticate } = require('../middleware/auth');
const { isManagerOrAbove } = require('../middleware/rbac');
const { uploadRegistration } = require('../middleware/upload');

// Helper middleware/handler to prevent browser/proxy caching
const setNoCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// Public
router.post('/', uploadRegistration.single('photo'), ctrl.submit);

// Admin (With anti-cache headers attached to GET requests)
router.get('/', setNoCache, authenticate, isManagerOrAbove, ctrl.getAll);
router.get('/:id', setNoCache, authenticate, isManagerOrAbove, ctrl.getById);
router.put('/:id/status', authenticate, isManagerOrAbove, ctrl.updateStatus);

module.exports = router;
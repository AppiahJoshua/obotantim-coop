const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productsController');
const { authenticate } = require('../middleware/auth');
const { isContentEditorOrAbove } = require('../middleware/rbac');
const { requireModuleAccess } = require('../utils/moduleAccess');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, isContentEditorOrAbove, requireModuleAccess('products'), ctrl.create);
router.put('/:id', authenticate, isContentEditorOrAbove, requireModuleAccess('products'), ctrl.update);
router.delete('/:id', authenticate, isContentEditorOrAbove, requireModuleAccess('products'), ctrl.remove);

module.exports = router;

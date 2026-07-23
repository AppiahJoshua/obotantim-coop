const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productsController');
const { authenticate } = require('../middleware/auth');
const { isContentEditorOrAbove } = require('../middleware/rbac');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, isContentEditorOrAbove, ctrl.create);
router.put('/:id', authenticate, isContentEditorOrAbove, ctrl.update);
router.delete('/:id', authenticate, isContentEditorOrAbove, ctrl.remove);

module.exports = router;

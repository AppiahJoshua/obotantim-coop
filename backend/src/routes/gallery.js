// gallery.js
const express = require('express');
const galleryRouter = express.Router();
const galleryCtrl = require('../controllers/galleryController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { isContentEditorOrAbove } = require('../middleware/rbac');
const { uploadGallery } = require('../middleware/upload');
const { requireModuleAccess } = require('../utils/moduleAccess');

galleryRouter.get('/', optionalAuthenticate, galleryCtrl.getAll);
galleryRouter.post('/', authenticate, isContentEditorOrAbove, requireModuleAccess('gallery'), uploadGallery.single('image'), galleryCtrl.upload);
galleryRouter.put('/:id', authenticate, isContentEditorOrAbove, requireModuleAccess('gallery'), galleryCtrl.update);
galleryRouter.delete('/:id', authenticate, isContentEditorOrAbove, requireModuleAccess('gallery'), galleryCtrl.remove);

module.exports = { galleryRouter };

// gallery.js
const express = require('express');
const galleryRouter = express.Router();
const galleryCtrl = require('../controllers/galleryController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { isContentEditorOrAbove } = require('../middleware/rbac');
const { uploadGallery } = require('../middleware/upload');

galleryRouter.get('/', optionalAuthenticate, galleryCtrl.getAll);
galleryRouter.post('/', authenticate, isContentEditorOrAbove, uploadGallery.single('image'), galleryCtrl.upload);
galleryRouter.put('/:id', authenticate, isContentEditorOrAbove, galleryCtrl.update);
galleryRouter.delete('/:id', authenticate, isContentEditorOrAbove, galleryCtrl.remove);

module.exports = { galleryRouter };

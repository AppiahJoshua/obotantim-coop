const express = require('express');
const { directorController, testimonialsController, announcementsController } = require('../controllers/contentControllers');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { isContentEditorOrAbove } = require('../middleware/rbac');
const { uploadAvatar } = require('../middleware/upload');
const { requireModuleAccess } = require('../utils/moduleAccess');

// Director routes
const directorRouter = express.Router();
directorRouter.get('/', directorController.get);
directorRouter.put('/', authenticate, isContentEditorOrAbove, requireModuleAccess('director'), uploadAvatar.single('photo'), directorController.update);

// Testimonials routes
const testimonialsRouter = express.Router();
testimonialsRouter.get('/', optionalAuthenticate, testimonialsController.getAll);
testimonialsRouter.post('/', authenticate, isContentEditorOrAbove, requireModuleAccess('director'), uploadAvatar.single('photo'), testimonialsController.create);
testimonialsRouter.put('/:id', authenticate, isContentEditorOrAbove, requireModuleAccess('director'), testimonialsController.update);
testimonialsRouter.delete('/:id', authenticate, isContentEditorOrAbove, requireModuleAccess('director'), testimonialsController.remove);

// Announcements routes
const announcementsRouter = express.Router();
announcementsRouter.get('/', optionalAuthenticate, announcementsController.getAll);
announcementsRouter.post('/', authenticate, isContentEditorOrAbove, requireModuleAccess('announcements'), announcementsController.create);
announcementsRouter.put('/:id', authenticate, isContentEditorOrAbove, requireModuleAccess('announcements'), announcementsController.update);
announcementsRouter.delete('/:id', authenticate, isContentEditorOrAbove, requireModuleAccess('announcements'), announcementsController.remove);

module.exports = { directorRouter, testimonialsRouter, announcementsRouter };

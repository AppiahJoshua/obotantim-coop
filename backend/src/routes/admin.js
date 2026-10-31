// users.js
const express = require('express');
const usersRouter = express.Router();
const usersCtrl = require('../controllers/usersController');
const { authenticate } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/rbac');

usersRouter.get('/', authenticate, isSuperAdmin, usersCtrl.getAll);
usersRouter.post('/', authenticate, isSuperAdmin, usersCtrl.create);
usersRouter.put('/:id', authenticate, isSuperAdmin, usersCtrl.update);
usersRouter.put('/:id/reset-password', authenticate, isSuperAdmin, usersCtrl.resetPassword);
usersRouter.put('/:id/mfa', authenticate, isSuperAdmin, usersCtrl.setMfa);
usersRouter.post('/:id/revoke-sessions', authenticate, isSuperAdmin, usersCtrl.revokeSessions);
usersRouter.delete('/:id', authenticate, isSuperAdmin, usersCtrl.remove);

// dashboard.js
const dashboardRouter = express.Router();
const { getOverview } = require('../controllers/dashboardController');
dashboardRouter.get('/', authenticate, getOverview);

module.exports = { usersRouter, dashboardRouter };

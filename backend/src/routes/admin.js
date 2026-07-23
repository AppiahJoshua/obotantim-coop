const express = require('express');

const usersRouter = express.Router();
const dashboardRouter = express.Router();
const permissionsRouter = express.Router();

// Controllers (Standard sibling relative path)
const usersCtrl = require('../controllers/usersController');
const { getOverview } = require('../controllers/dashboardController');
const permissionsCtrl = require('../controllers/permissionsController');

// Middleware
const { authenticate } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/rbac');

// ── User Management Routes (Super Admin Only) ────────────────────────
usersRouter.get('/', authenticate, isSuperAdmin, usersCtrl.getAll);
usersRouter.post('/', authenticate, isSuperAdmin, usersCtrl.create);
usersRouter.put('/:id', authenticate, isSuperAdmin, usersCtrl.update);
usersRouter.put('/:id/reset-password', authenticate, isSuperAdmin, usersCtrl.resetPassword);
usersRouter.delete('/:id', authenticate, isSuperAdmin, usersCtrl.remove);

// ── Dynamic Dashboard Layout & Role Settings ──────────────────────────
permissionsRouter.get('/roles', authenticate, permissionsCtrl.getRoles);
permissionsRouter.get('/', authenticate, permissionsCtrl.getWidgetPermissions);
permissionsRouter.post('/toggle', authenticate, isSuperAdmin, permissionsCtrl.toggleWidgetVisibility);

// ── Dashboard Overview Route ─────────────────────────────────────────
dashboardRouter.get('/', authenticate, getOverview);

module.exports = { usersRouter, dashboardRouter, permissionsRouter };

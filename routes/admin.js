const express = require('express');
const path = require('path');

const usersRouter = express.Router();
const dashboardRouter = express.Router();
const permissionsRouter = express.Router();

// Controllers (Absolute path resolution to guarantee correct file loading on Render)
const usersCtrl = require(path.join(__dirname, '../controllers/usersController'));
const { getOverview } = require(path.join(__dirname, '../controllers/dashboardController'));
const permissionsCtrl = require(path.join(__dirname, '../controllers/permissionsController'));

// Middleware (Absolute path resolution)
const { authenticate } = require(path.join(__dirname, '../middleware/auth'));
const { isSuperAdmin } = require(path.join(__dirname, '../middleware/rbac'));

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

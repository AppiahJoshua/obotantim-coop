const express = require('express');

const usersRouter = express.Router();
const dashboardRouter = express.Router();
const permissionsRouter = express.Router();

// Controllers
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

// ── Dynamic Dashboard Layout Settings ────────────────────────────────
// GET: Accessible by ALL authenticated staff (so their layout knows what UI elements to display)
permissionsRouter.get('/', authenticate, permissionsCtrl.getWidgetPermissions);

// POST: Strictly locked to Super Admin (only super admins can change settings)
permissionsRouter.post('/toggle', authenticate, isSuperAdmin, permissionsCtrl.toggleWidgetVisibility);

// ── Dashboard Overview Route (All Authenticated Staff) ───────────────
dashboardRouter.get('/', authenticate, getOverview);

module.exports = { usersRouter, dashboardRouter, permissionsRouter };

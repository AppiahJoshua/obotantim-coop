const express = require('express');
const controller = require('../controllers/exportsController');
const { authenticate } = require('../middleware/auth');
const { isManagerOrAbove, isSuperAdmin } = require('../middleware/rbac');
const auditController = require('../controllers/auditLogsController');

const router = express.Router();
router.get('/registrations.csv', authenticate, isManagerOrAbove, controller.exportRegistrations);
router.get('/messages.csv', authenticate, isManagerOrAbove, controller.exportMessages);
router.get('/audit-logs.csv', authenticate, isSuperAdmin, auditController.exportCsv);

module.exports = router;

const express = require('express');
const controller = require('../controllers/exportsController');
const { authenticate } = require('../middleware/auth');
const { isManagerOrAbove, isSuperAdmin } = require('../middleware/rbac');
const auditController = require('../controllers/auditLogsController');
const { requireModuleAccess } = require('../utils/moduleAccess');

const router = express.Router();
router.get('/registrations.csv', authenticate, isManagerOrAbove, requireModuleAccess('registrations'), controller.exportRegistrations);
router.get('/messages.csv', authenticate, isManagerOrAbove, requireModuleAccess('messages'), controller.exportMessages);
router.get('/audit-logs.csv', authenticate, isSuperAdmin, auditController.exportCsv);

module.exports = router;

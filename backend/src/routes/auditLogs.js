const express = require('express');
const controller = require('../controllers/auditLogsController');
const { authenticate } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate, isSuperAdmin);
router.get('/users', controller.getUsers);
router.get('/actions', controller.getActions);
router.get('/export.csv', controller.exportCsv);
router.get('/', controller.list);

module.exports = router;

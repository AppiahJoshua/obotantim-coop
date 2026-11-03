const express = require('express');
const controller = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.get('/profile', controller.getProfile);
router.put('/profile', controller.updateProfile);
router.put('/profile/password', controller.changePassword);
router.get('/module-access', require('../controllers/usersController').getModuleAccess);

module.exports = router;

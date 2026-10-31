// routes/auth.js
const express = require('express');
const router = express.Router();
const { login, getMe, changePassword, forgotPassword, resetPassword, setupMfa, verifyMfaSetup, verifyMfaLogin, disableMfa } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/mfa/verify-login', verifyMfaLogin);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);
router.post('/mfa/setup', authenticate, setupMfa);
router.post('/mfa/verify', authenticate, verifyMfaSetup);
router.post('/mfa/disable', authenticate, disableMfa);

module.exports = router;

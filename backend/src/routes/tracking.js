const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/trackingController');

const router = express.Router();
const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tracking attempts. Please try again later.' },
});
router.post('/', trackingLimiter, controller.track);
router.put('/contact', trackingLimiter, controller.updateContact);

module.exports = router;

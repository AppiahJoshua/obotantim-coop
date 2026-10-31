const express = require('express');
const controller = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.get('/', authenticate, controller.search);

module.exports = router;

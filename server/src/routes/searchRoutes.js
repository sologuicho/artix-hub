const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Global search endpoint
router.get('/global', searchController.globalSearch);

module.exports = router;





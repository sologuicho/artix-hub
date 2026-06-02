const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, feedController.getFeed);
router.get('/suggestions', protect, feedController.getSuggestions);

module.exports = router;

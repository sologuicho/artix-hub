
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { updateProgress, getProgress, getRecommendations } = require('../controllers/readingProgressController');

const router = express.Router();

router.post('/', protect, verifyCsrf, updateProgress);
router.get('/', protect, getProgress);
router.get('/recommendations', protect, getRecommendations);

module.exports = router;

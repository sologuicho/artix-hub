const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

// All AI endpoints require authentication
router.post('/chat', protect, verifyCsrf, aiController.chat);
router.post('/improve', protect, verifyCsrf, aiController.improveText);
router.post('/generate-ideas', protect, verifyCsrf, aiController.generateIdeas);
router.post('/suggestions', protect, verifyCsrf, aiController.getSuggestions);

module.exports = router;








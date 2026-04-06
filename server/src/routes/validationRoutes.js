const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validationController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

// All validation endpoints require authentication
router.post('/article', protect, verifyCsrf, validationController.validateArticle);
router.post('/blog', protect, verifyCsrf, validationController.validateBlogPost);
router.post('/event', protect, verifyCsrf, validationController.validateEvent);
router.post('/research', protect, verifyCsrf, validationController.validateResearch);

module.exports = router;






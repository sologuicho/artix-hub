const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { validateArticle, validateComment } = require('../middleware/validationMiddleware');

const { optionalAuth } = require('../middleware/optionalAuth');
const { checkUsageLimit } = require('../controllers/subscriptionController');

// Public routes
router.get('/', articleController.getAllArticles);
router.get('/categories', articleController.getCategories);
router.get('/:id', optionalAuth, checkUsageLimit, articleController.getArticle);

// Protected routes
router.post('/', protect, verifyCsrf, validateArticle, articleController.createArticle);
router.put('/:id', protect, verifyCsrf, articleController.updateArticle);
router.post('/:id/archive', protect, verifyCsrf, articleController.archiveArticle);
router.post('/:id/unarchive', protect, verifyCsrf, articleController.unarchiveArticle);
router.delete('/:id', protect, verifyCsrf, articleController.deleteArticle);
router.post('/:id/comments', protect, verifyCsrf, validateComment, articleController.addComment);

module.exports = router;


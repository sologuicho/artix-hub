const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { validateBlogPost } = require('../middleware/validationMiddleware');

// Public routes
router.get('/', blogController.getAllBlogPosts);
router.get('/categories', blogController.getCategories);
router.get('/:id', blogController.getBlogPost);

// Protected routes
router.post('/', protect, verifyCsrf, validateBlogPost, blogController.createBlogPost);
router.put('/:id', protect, verifyCsrf, blogController.updateBlogPost);
router.post('/:id/archive', protect, verifyCsrf, blogController.archiveBlogPost);
router.post('/:id/unarchive', protect, verifyCsrf, blogController.archiveBlogPost);
router.delete('/:id', protect, verifyCsrf, blogController.deleteBlogPost);

module.exports = router;


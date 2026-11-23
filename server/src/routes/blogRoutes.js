const express = require('express')
const router = express.Router()
const blogController = require('../controllers/blogController')
const { protect } = require('../middleware/authMiddleware')
const { optionalAuth } = require('../middleware/optionalAuth')
const { checkPermission } = require('../middleware/checkTier')
const { verifyCsrf } = require('../middleware/csrfMiddleware')
const { validateBlogPost } = require('../middleware/validationMiddleware')

// Public routes
router.get('/', blogController.getAllBlogPosts)
router.get('/categories', blogController.getCategories)
// optionalAuth lets the author see their own reviewing/rejected post
router.get('/:id', optionalAuth, blogController.getBlogPost)

// Protected routes
router.post(
  '/',
  protect,
  checkPermission('canPublishBlog'),
  verifyCsrf,
  validateBlogPost,
  blogController.createBlogPost
)
router.put(
  '/:id',
  protect,
  checkPermission('canPublishBlog'),
  verifyCsrf,
  blogController.updateBlogPost
)
router.post(
  '/:id/archive',
  protect,
  checkPermission('canPublishBlog'),
  verifyCsrf,
  blogController.archiveBlogPost
)
router.post(
  '/:id/unarchive',
  protect,
  checkPermission('canPublishBlog'),
  verifyCsrf,
  blogController.archiveBlogPost
)
router.delete(
  '/:id',
  protect,
  checkPermission('canPublishBlog'),
  verifyCsrf,
  blogController.deleteBlogPost
)

module.exports = router

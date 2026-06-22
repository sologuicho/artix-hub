const express = require('express');
const router = express.Router();
const researchController = require('../controllers/researchController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkTier');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { validateArticle } = require('../middleware/validationMiddleware'); // Reuse article validation

// Public routes
router.get('/', researchController.getAllResearch);
router.get('/categories', researchController.getCategories);
router.get('/:id/preview', researchController.getResearchPreview);

// Protected routes
router.get('/:id', protect, checkPermission('canAccessResearch'), researchController.getResearch);
router.post('/', protect, checkPermission('canPublishArticles'), verifyCsrf, validateArticle, researchController.createResearch);
router.put('/:id', protect, checkPermission('canPublishArticles'), verifyCsrf, researchController.updateResearch);
router.post('/:id/archive', protect, checkPermission('canPublishArticles'), verifyCsrf, researchController.archiveResearch);
router.post('/:id/unarchive', protect, checkPermission('canPublishArticles'), verifyCsrf, researchController.archiveResearch);
router.delete('/:id', protect, checkPermission('canPublishArticles'), verifyCsrf, researchController.deleteResearch);

module.exports = router;


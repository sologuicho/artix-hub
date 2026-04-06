const express = require('express');
const router = express.Router();
const researchController = require('../controllers/researchController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { validateArticle } = require('../middleware/validationMiddleware'); // Reuse article validation

// Public routes
router.get('/', researchController.getAllResearch);
router.get('/categories', researchController.getCategories);
router.get('/:id', researchController.getResearch);

// Protected routes
router.post('/', protect, verifyCsrf, validateArticle, researchController.createResearch);
router.put('/:id', protect, verifyCsrf, researchController.updateResearch);
router.post('/:id/archive', protect, verifyCsrf, researchController.archiveResearch);
router.post('/:id/unarchive', protect, verifyCsrf, researchController.archiveResearch);
router.delete('/:id', protect, verifyCsrf, researchController.deleteResearch);

module.exports = router;


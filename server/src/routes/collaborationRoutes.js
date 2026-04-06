const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

// Article collaborations
router.post('/articles/:id/collaborators', protect, verifyCsrf, collaborationController.inviteArticleCollaborator);
router.put('/articles/:id/collaborations/:collaborationId/respond', protect, verifyCsrf, collaborationController.respondToArticleInvitation);
router.get('/articles/:id/collaborations', protect, collaborationController.getArticleCollaborations);

// Event collaborations
router.post('/events/:id/collaborators', protect, verifyCsrf, collaborationController.inviteEventCollaborator);
router.put('/events/:id/collaborations/:collaborationId/respond', protect, verifyCsrf, collaborationController.respondToEventInvitation);
router.get('/events/:id/collaborations', protect, collaborationController.getEventCollaborations);

module.exports = router;






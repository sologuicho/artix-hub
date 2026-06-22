const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkTier');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

// Article collaborations
router.post('/articles/:id/collaborators', protect, checkPermission('canCollaborate'), verifyCsrf, collaborationController.inviteArticleCollaborator);
router.put('/articles/:id/collaborations/:collaborationId/respond', protect, checkPermission('canCollaborate'), verifyCsrf, collaborationController.respondToArticleInvitation);
router.get('/articles/:id/collaborations', protect, checkPermission('canCollaborate'), collaborationController.getArticleCollaborations);

// Event collaborations
router.post('/events/:id/collaborators', protect, checkPermission('canCollaborate'), verifyCsrf, collaborationController.inviteEventCollaborator);
router.put('/events/:id/collaborations/:collaborationId/respond', protect, checkPermission('canCollaborate'), verifyCsrf, collaborationController.respondToEventInvitation);
router.get('/events/:id/collaborations', protect, checkPermission('canCollaborate'), collaborationController.getEventCollaborations);

module.exports = router;






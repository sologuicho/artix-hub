const express = require('express');
const router = express.Router();
const reactionController = require('../controllers/reactionController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

router.post('/toggle', protect, verifyCsrf, reactionController.toggleReaction);
router.get('/counts', reactionController.getReactionCounts);
router.get('/user', protect, reactionController.getUserReactions);

module.exports = router;







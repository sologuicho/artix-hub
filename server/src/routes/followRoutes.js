const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

router.post('/:userId', protect, verifyCsrf, followController.toggleFollow);
router.get('/:userId/followers', followController.getFollowers);
router.get('/:userId/following', followController.getFollowing);
router.get('/:userId/check', protect, followController.checkFollow);

module.exports = router;






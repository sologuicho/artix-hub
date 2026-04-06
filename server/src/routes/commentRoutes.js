const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

router.get('/', commentController.getComments);
router.post('/', protect, verifyCsrf, commentController.addComment);
router.put('/:id', protect, verifyCsrf, commentController.updateComment);
router.delete('/:id', protect, verifyCsrf, commentController.deleteComment);

module.exports = router;







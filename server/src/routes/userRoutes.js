const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

router.get('/search', protect, userController.searchUsers);
router.get('/:userId', userController.getUserProfile); // Public route

// Account management (protected + CSRF)
router.post('/me/change-password', protect, verifyCsrf, userController.changePassword);
router.delete('/me', protect, verifyCsrf, userController.deleteAccount);

module.exports = router;




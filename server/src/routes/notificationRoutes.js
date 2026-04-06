const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

router.get('/', protect, notificationController.getNotifications);
router.put('/:id/read', protect, verifyCsrf, notificationController.markAsRead);
router.put('/read-all', protect, verifyCsrf, notificationController.markAllAsRead);
router.delete('/:id', protect, verifyCsrf, notificationController.deleteNotification);

module.exports = router;







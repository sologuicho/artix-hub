const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

router.post('/events/:eventId', protect, verifyCsrf, reminderController.setEventReminder);
router.delete('/events/:eventId', protect, verifyCsrf, reminderController.removeEventReminder);
router.get('/events/:eventId', protect, reminderController.getEventReminders);

module.exports = router;







const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { validateEvent } = require('../middleware/validationMiddleware');

// Public routes
router.get('/', eventController.getAllEvents);
router.get('/categories', eventController.getCategories);
router.get('/:id', eventController.getEvent);

// Protected routes
router.post('/', protect, verifyCsrf, validateEvent, eventController.createEvent);
router.put('/:id', protect, verifyCsrf, eventController.updateEvent);
router.post('/:id/archive', protect, verifyCsrf, eventController.archiveEvent);
router.post('/:id/unarchive', protect, verifyCsrf, eventController.archiveEvent);
router.delete('/:id', protect, verifyCsrf, eventController.deleteEvent);
router.post('/:id/register', protect, verifyCsrf, eventController.registerForEvent);

module.exports = router;


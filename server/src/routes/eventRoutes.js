const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkTier');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { validateEvent } = require('../middleware/validationMiddleware');

// Public routes
router.get('/', eventController.getAllEvents);
router.get('/categories', eventController.getCategories);
router.get('/:id', eventController.getEvent);
router.get('/:id/lobby/messages', eventController.getLobbyMessages);

// Protected routes
router.post('/', protect, checkPermission('canPublishEvents'), verifyCsrf, validateEvent, eventController.createEvent);
router.put('/:id', protect, checkPermission('canPublishEvents'), verifyCsrf, eventController.updateEvent);
router.post('/:id/archive', protect, checkPermission('canPublishEvents'), verifyCsrf, eventController.archiveEvent);
router.post('/:id/unarchive', protect, checkPermission('canPublishEvents'), verifyCsrf, eventController.archiveEvent);
router.delete('/:id', protect, checkPermission('canPublishEvents'), verifyCsrf, eventController.deleteEvent);
router.post('/:id/register', protect, verifyCsrf, eventController.registerForEvent);
router.delete('/:id/register', protect, verifyCsrf, eventController.unregisterFromEvent);
router.get('/:id/waitlist', protect, eventController.getWaitlistStatus);
router.post('/:id/live', protect, verifyCsrf, eventController.setLive);

module.exports = router;

const express = require('express');
const router = express.Router();
const { updateSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

router.post('/upgrade', protect, verifyCsrf, updateSubscription);

module.exports = router;

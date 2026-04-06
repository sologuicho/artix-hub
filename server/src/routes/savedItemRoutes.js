const express = require('express');
const router = express.Router();
const savedItemController = require('../controllers/savedItemController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

router.post('/', protect, verifyCsrf, savedItemController.saveItem);
router.get('/', protect, savedItemController.getSavedItems);
router.get('/check', protect, savedItemController.checkSaved);

module.exports = router;






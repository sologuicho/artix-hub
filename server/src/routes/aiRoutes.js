const express = require('express')
const router = express.Router()
const aiController      = require('../controllers/aiController')
const aiAssistController = require('../controllers/aiAssistController')
const { protect } = require('../middleware/authMiddleware')
const { verifyCsrf } = require('../middleware/csrfMiddleware')
const { aiLimiter } = require('../middleware/rateLimitMiddleware')

// Editor tools (OpenAI/Gemini based, unchanged)
router.post('/chat',          protect, verifyCsrf, aiController.chat)
router.post('/improve',       protect, verifyCsrf, aiController.improveText)
router.post('/generate-ideas', protect, verifyCsrf, aiController.generateIdeas)
router.post('/suggestions',   protect, verifyCsrf, aiController.getSuggestions)

// ai-core powered — sidebar assistant and semantic search
// /assist receives {entity, id, messages}; backend loads content from DB
router.post('/assist', protect, verifyCsrf, aiLimiter, aiAssistController.assist)
router.post('/search', protect, verifyCsrf, aiLimiter, aiAssistController.search)

module.exports = router

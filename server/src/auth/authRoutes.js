const express = require('express');
const passport = require('./passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter, checkUsernameLimiter } = require('../middleware/rateLimitMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

// Traditional Native Auth (rate limited)
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=oauth_failed` }),
  authController.oauthCallback
);

// GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=oauth_failed` }),
  authController.oauthCallback
);

// Microsoft
router.get('/microsoft', passport.authenticate('azure_ad_oauth2', { scope: ['profile', 'openid', 'email'] }));
router.get('/microsoft/callback',
  passport.authenticate('azure_ad_oauth2', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=oauth_failed` }),
  authController.oauthCallback
);

// Logout
router.post('/logout', verifyCsrf, authController.logout);

// Socket.IO: JWT for handshake (session cookie is HttpOnly — browser cannot read it); revoked via tokenVersion
router.get(
  '/socket-token',
  require('../middleware/authMiddleware').protect,
  authController.socketToken
);

// Check username availability (rate limited to prevent enumeration)
router.get('/check-username', checkUsernameLimiter, authController.checkUsername);

// Setup username (protected)
router.post('/setup-username', require('../middleware/authMiddleware').protect, require('../middleware/csrfMiddleware').verifyCsrf, authController.setupUsername);

module.exports = router;

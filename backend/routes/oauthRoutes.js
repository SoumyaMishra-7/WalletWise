const express = require('express');
const passport = require('passport');
const { protect } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

const googleOauthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);

const frontendBaseUrl = (
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')
).replace(/\/+$/, '');

const oauthConfigured = googleOauthEnabled && Boolean(frontendBaseUrl);

if (oauthConfigured) {
  router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  }));

  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${frontendBaseUrl}/login?error=google` }),
    authController.googleCallback
  );
} else {
  router.get('/google', (_req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, and FRONTEND_URL in environment variables.'
    });
  });

  router.get('/google/callback', (_req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, and FRONTEND_URL in environment variables.'
    });
  });
}

router.get('/me', protect, authController.me);

module.exports = router;

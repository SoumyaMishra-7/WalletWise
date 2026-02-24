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

if (googleOauthEnabled) {
  router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: true
  }));

  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google` }),
    authController.googleCallback
  );
} else {
  router.get('/google', (_req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL in .env.'
    });
  });

  router.get('/google/callback', (_req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL in .env.'
    });
  });
}

router.get('/me', protect, authController.me);

module.exports = router;

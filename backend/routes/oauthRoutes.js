const express = require('express');
const passport = require('passport');
const { protect } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google` }),
  authController.googleCallback
);

router.get('/me', protect, authController.me);

module.exports = router;

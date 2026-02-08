const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { 
  userRegisterSchema, 
  userLoginSchema, 
  userUpdateSchema,
  verifyEmailSchema,
  resendOtpSchema 
} = require('../utils/validationSchemas');
const authController = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts. Please try again later.'
});

router.post('/register', authLimiter, validate(userRegisterSchema), authController.register);
router.post('/login', authLimiter, validate(userLoginSchema), authController.login);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), authController.resendEmailOtp);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', protect, authController.me);
router.put('/profile', protect, validate(userUpdateSchema), authController.updateProfile);

module.exports = router;

const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  userRegisterSchema,
  userLoginSchema,
  userUpdateSchema,
  verifyEmailSchema,
  resendOtpSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  resetPasswordSchema
} = require('../utils/validationSchemas');
const authController = require('../controllers/authController');

const singleUpload = require('../middleware/multer');

const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const currencyMiddleware = require('../middleware/currencyConverter.middleware');

router.post('/register', authLimiter, currencyMiddleware, validate(userRegisterSchema), authController.register);
router.post('/login', authLimiter, currencyMiddleware, validate(userLoginSchema), authController.login);
router.post('/verify-email', authLimiter, currencyMiddleware, validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), authController.resendEmailOtp);
router.post('/forgot-password', authLimiter, validate(forgotPasswordRequestSchema), authController.requestPasswordReset);
router.post('/forgot-password/verify', authLimiter, validate(forgotPasswordVerifySchema), authController.verifyPasswordResetOtp);
router.post('/forgot-password/reset', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', protect, authController.me);
router.put('/profile', protect, singleUpload, validate(userUpdateSchema), authController.updateProfile);

module.exports = router;

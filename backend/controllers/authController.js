const bcrypt = require('bcryptjs');
const { z } = require('zod');
const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require("../middleware/asyncHandler");
const { sendEmail } = require('../utils/mailer');
const { generateOtp, hashOtp, otpExpiresAt } = require('../utils/otp');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getTokenExpirationDate
} = require('../utils/tokens');
const cloudinary = require('../config/cloudinary');
const getDataUri = require('../utils/dataUri');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email')
});

const resetPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email'),
  otp: z.string().trim().min(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters')
});

const registerSchema = z.object({
  studentId: z.string().trim().min(1, 'Student ID is required'),
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phoneNumber: z.string().trim().optional().or(z.literal('')),
  department: z.string().trim().min(1, 'Department is required'),
  year: z.enum(['1st', '2nd', '3rd', '4th', '5th'])
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email'),
  password: z.string().min(1, 'Password is required')
});

const updateProfileSchema = z.object({
  fullName: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
  department: z.string().trim().optional(),
  year: z.enum(['1st', '2nd', '3rd', '4th', '5th']).optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  language: z.string().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  incomeFrequency: z.string().optional(),
  incomeSources: z.string().optional(),
  priorities: z.string().optional(),
  riskTolerance: z.string().optional(),
  billRemindersEnabled: z.union([z.boolean(), z.string()]).transform(v => v === true || v === 'true').optional(),
  reminderDaysBefore: z.union([z.number(), z.string()]).transform(Number).refine(v => [1, 3, 7].includes(v), 'Must be 1, 3, or 7').optional()
});

const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/'
  };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('access_token', accessToken, {
    ...cookieOptions(),
    expires: getTokenExpirationDate(accessToken) || new Date(Date.now() + 10 * 60 * 1000)
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions(),
    expires: getTokenExpirationDate(refreshToken) || new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('access_token', cookieOptions());
  res.clearCookie('refresh_token', cookieOptions());
};

const safeUser = (user) => ({
  id: user._id,
  email: user.email,
  fullName: user.fullName,
  studentId: user.studentId,
  department: user.department,
  year: user.year,
  phoneNumber: user.phoneNumber,
  walletBalance: user.walletBalance,
  provider: user.provider,
  emailVerified: user.emailVerified,
  avatar: user.avatar,
  currency: user.currency,
  dateFormat: user.dateFormat,
  language: user.language,
  incomeFrequency: user.incomeFrequency,
  incomeSources: user.incomeSources,
  priorities: user.priorities,
  riskTolerance: user.riskTolerance,
  theme: user.theme || 'light'
});

const sendVerificationOtp = async (user) => {
  const otp = generateOtp();
  user.emailOtpHash = hashOtp(otp);
  user.emailOtpExpires = otpExpiresAt(10);
  user.emailOtpSentAt = new Date();
  await user.save();

  const subject = 'Verify your WalletWise account';
  const text = `Your WalletWise verification code is ${otp}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Verify your WalletWise account</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, text, html });
};

const getPasswordResetExpiryMinutes = () => {
  const parsed = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 15);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
};

const sendPasswordResetInstructions = async (user, { skipEmail } = {}) => {
  const expiryMinutes = getPasswordResetExpiryMinutes();
  const expiresAt = otpExpiresAt(expiryMinutes);
  const token = crypto.randomBytes(32).toString('hex');
  const otp = generateOtp();

  user.passwordResetOtpHash = hashOtp(otp);
  user.passwordResetOtpExpires = expiresAt;
  user.passwordResetOtpSentAt = new Date();
  user.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetTokenExpires = expiresAt;
  user.passwordResetTokenSentAt = new Date();
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetLink = `${frontendUrl}/forgot-password/reset?token=${token}`;

  if (skipEmail) {
    return { otp, token, resetLink, delivered: false };
  }

  const subject = 'Reset your WalletWise password';
  const text = `Use this link to reset your WalletWise password: ${resetLink}\n\nYour backup reset code is ${otp}. Both expire in ${expiryMinutes} minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Reset your WalletWise password</h2>
      <p>Click this secure link to reset your password:</p>
      <p>
        <a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p>If the button doesn't work, use this URL:</p>
      <p style="word-break:break-all;">${resetLink}</p>
      <p>Backup reset code:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This link/code expires in ${expiryMinutes} minutes.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, text, html });
  return { otp, token, resetLink, delivered: true };
};

const register = asyncHandler(async (req, res) => {
  console.log('📝 Incoming Registration Request:', JSON.stringify(req.body, null, 2));

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.errors[0]?.message || 'Invalid input'
    });
  }

  const { studentId, fullName, email, password, phoneNumber, department, year } = parsed.data;

  const existing = await User.findOne({ $or: [{ email }, { studentId }] });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Registration failed. Please check your details.'
    });
    await user.setPassword(password);
    await User.saveWithUniqueStudentId(user);

    // ✅ Skip email verification for local testing
    user.emailVerified = true;
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: accessToken,
      user: safeUser(user)
    });

const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.errors[0]?.message || 'Invalid input'
    });
  }

  const { email, password } = parsed.data;
  const user = await User.findOne({ email });

  if (!user || !user.passwordHash) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email before logging in.',
      email: user.email
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await User.saveWithUniqueStudentId(user);

  setAuthCookies(res, accessToken, refreshToken);

  return res.json({
    success: true,
    message: 'Login successful',
    user: safeUser(user)
  });
});

    return res.json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      user: safeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }

  clearAuthCookies(res);
  return res.json({ success: true, message: 'Logged out successfully' });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token missing' });
  }

  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.sub);

  if (!user || !user.refreshTokenHash) {
    clearAuthCookies(res);
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }

  const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!valid) {
    clearAuthCookies(res);
    return res.status(401).json({ success: false, message: 'Refresh token revoked' });
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  await user.save();

  setAuthCookies(res, newAccessToken, newRefreshToken);

  return res.json({ success: true, message: 'Session refreshed' });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return res.json({ success: true, user: safeUser(user) });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and OTP are required'
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.emailVerified) {
    return res.json({ success: true, message: 'Email already verified', user: safeUser(user) });
  }

  if (!user.emailOtpHash || !user.emailOtpExpires) {
    return res.status(400).json({ success: false, message: 'No OTP requested' });
  }

  if (user.emailOtpExpires < new Date()) {
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  const matches = user.emailOtpHash === hashOtp(String(otp).trim());
  if (!matches) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  user.emailVerified = true;
  user.emailOtpHash = null;
  user.emailOtpExpires = null;
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);

  return res.json({
    success: true,
    message: 'Email verified successfully',
    user: safeUser(user)
  });
});

const resendEmailOtp = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.emailVerified) {
    return res.json({ success: true, message: 'Email already verified' });
  }

  await sendVerificationOtp(user);

  return res.json({
    success: true,
    message: 'OTP resent successfully'
  });
});

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = String(email || '').toLowerCase();
    let devResetLink = null;
    let emailSent = false;

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      try {
        await sendPasswordResetInstructions(user);
        emailSent = true;
      } catch (mailError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn("Mail error (ignored in dev):", mailError.message);
          const fallback = await sendPasswordResetInstructions(user, { skipEmail: true });
          devResetLink = fallback.resetLink;
          res.locals.devOtp = fallback.otp; // Store to send in response
        } else {
          throw mailError;
        }
      }
    }

    return res.json({
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
      emailSent,
      ...(devResetLink ? { devResetLink, devOtp: res.locals.devOtp } : {})
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send password reset link'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, token, newPassword, password } = req.body || {};
    const effectivePassword = newPassword || password;
    const normalizedEmail = String(email || '').toLowerCase();
    const hasToken = Boolean(token);
    const hasOtpFlow = Boolean(normalizedEmail && otp);

    if (!effectivePassword || (!hasToken && !hasOtpFlow)) {
      return res.status(400).json({
        success: false,
        message: 'Password and either token or email+OTP are required'
      });
    }

    let user = null;

    if (hasToken) {
      const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
      user = await User.findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });
      }
    } else {
      user = await User.findOne({ email: normalizedEmail });
      if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpires) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      if (user.passwordResetOtpExpires < new Date()) {
        return res.status(400).json({ success: false, message: 'OTP expired' });
      }

      const matches = user.passwordResetOtpHash === hashOtp(String(otp).trim());
      if (!matches) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }
    }

    await user.setPassword(effectivePassword);
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpires = null;
    user.passwordResetOtpSentAt = null;
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpires = null;
    user.passwordResetTokenSentAt = null;

    if (user.provider === 'google') {
      user.provider = 'both';
    }

    await user.save();

    return res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

const updateProfile = asyncHandler(async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.errors[0]?.message || 'Invalid input'
    });
  }

  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (req.file) {
    const fileUri = getDataUri(req.file);
    const myCloud = await cloudinary.uploader.upload(fileUri.content);
    user.avatar = myCloud.secure_url;
  }

  const {
    fullName, phoneNumber, department, year,
    currency, dateFormat, language, theme,
    incomeFrequency, incomeSources, priorities, riskTolerance
  } = parsed.data;

  if (fullName !== undefined) user.fullName = fullName.trim();
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber.trim();
  if (department !== undefined) user.department = department.trim();
  if (year !== undefined) user.year = year;

  if (currency !== undefined) user.currency = currency;
  if (dateFormat !== undefined) user.dateFormat = dateFormat;
  if (language !== undefined) user.language = language;
  if (theme !== undefined) user.theme = theme;
  if (incomeFrequency !== undefined) user.incomeFrequency = incomeFrequency;
  if (incomeSources !== undefined) user.incomeSources = incomeSources;
  if (priorities !== undefined) user.priorities = priorities;
  if (riskTolerance !== undefined) user.riskTolerance = riskTolerance;

  if (billRemindersEnabled !== undefined || reminderDaysBefore !== undefined) {
    if (!user.notificationPrefs) {
      user.notificationPrefs = {};
    }
    if (billRemindersEnabled !== undefined) user.notificationPrefs.billRemindersEnabled = billRemindersEnabled;
    if (reminderDaysBefore !== undefined) user.notificationPrefs.reminderDaysBefore = reminderDaysBefore;
  }

  await user.save();

  return res.json({
    success: true,
    message: 'Profile updated successfully',
    user: safeUser(user)
  });
});

const googleCallback = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailOtpHash = null;
    user.emailOtpExpires = null;
    user.emailOtpSentAt = null;
    await User.saveWithUniqueStudentId(user);
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await User.saveWithUniqueStudentId(user);

  setAuthCookies(res, accessToken, refreshToken);

  const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
  return res.redirect(redirectUrl);
});

const forgotPassword = async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.errors[0]?.message || 'Invalid email'
      });
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = generateOtp();
    user.passwordResetOtpHash = hashOtp(otp);
    user.passwordResetOtpExpires = otpExpiresAt(10);
    user.passwordResetOtpSentAt = new Date();
    await user.save();

    const subject = 'Reset your WalletWise password 🔐';
    const text = `Your OTP is ${otp}`;
    const html = `<p>Your OTP is <b>${otp}</b></p>`;

    await sendEmail({ to: user.email, subject, text, html });

    return res.json({ success: true, message: 'OTP sent to your email', next: 'verify_otp' });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error with forgot password' });
  }
};

const verifyPasswordResetOtp = async (req, res) => {
  try {
    res.status(200).json({ message: "OTP verified" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  me,
  updateProfile,
  googleCallback,
  verifyEmail,
  resendEmailOtp,
  requestPasswordReset,
  verifyPasswordResetOtp,
  forgotPassword,
  resetPassword
};
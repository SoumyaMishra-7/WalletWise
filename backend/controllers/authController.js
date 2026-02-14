const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
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
  incomeFrequency: z.string().optional(),
  incomeSources: z.string().optional(),
  priorities: z.string().optional(),
  riskTolerance: z.string().optional()
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
  riskTolerance: user.riskTolerance
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

const register = async (req, res) => {
  try {
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
    }

    const user = new User({
      studentId,
      fullName,
      email,
      phoneNumber: phoneNumber || '',
      department,
      year,
      provider: 'local',
      walletBalance: 0,
      emailVerified: false
    });
    await user.setPassword(password);
    await User.saveWithUniqueStudentId(user);
    await sendVerificationOtp(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      requiresVerification: true,
      email: user.email
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

const login = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.sub);
        if (user) {
          user.refreshTokenHash = null;
          await user.save();
        }
      } catch (error) {
        // ignore
      }
    }

    clearAuthCookies(res);
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

const refresh = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Refresh error:', error);
    clearAuthCookies(res);
    return res.status(401).json({ success: false, message: 'Refresh failed' });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: safeUser(user) });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verifyEmail = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying email' });
  }
};

const resendEmailOtp = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend OTP' });
  }
};

const updateProfile = async (req, res) => {
  try {
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
      currency, dateFormat, language,
      incomeFrequency, incomeSources, priorities, riskTolerance
    } = parsed.data;

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber.trim();
    if (department !== undefined) user.department = department.trim();
    if (year !== undefined) user.year = year;

    // Profile Settings
    if (currency !== undefined) user.currency = currency;
    if (dateFormat !== undefined) user.dateFormat = dateFormat;
    if (language !== undefined) user.language = language;

    // Financial Settings
    if (incomeFrequency !== undefined) user.incomeFrequency = incomeFrequency;
    if (incomeSources !== undefined) user.incomeSources = incomeSources;
    if (priorities !== undefined) user.priorities = priorities;
    if (riskTolerance !== undefined) user.riskTolerance = riskTolerance;

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: safeUser(user)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

const googleCallback = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google`);
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
  resendEmailOtp
};

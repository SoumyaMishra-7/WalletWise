const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  studentId: {
    type: String,
    trim: true,
    required: [true, 'Student ID is required'],
    unique: true,
    set: value => (value === '' || value === null ? undefined : value)
  },
  fullName: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailOtpHash: {
    type: String
  },
  emailOtpExpires: {
    type: Date
  },
  emailOtpSentAt: {
    type: Date
  },
  passwordResetOtpHash: {
    type: String
  },
  passwordResetOtpExpires: {
    type: Date
  },
  passwordResetOtpSentAt: {
    type: Date
  },
  passwordResetTokenHash: {
    type: String
  },
  passwordResetTokenExpires: {
    type: Date
  },
  passwordResetTokenSentAt: {
    type: Date
  },
  passwordHash: {
    type: String
  },
  passwordResetOtpHash: {
    type: String
  },
  passwordResetOtpExpires: {
    type: Date
  },
  passwordResetOtpSentAt: {
    type: Date
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'both'],
    default: 'local'
  },
  googleId: {
    type: String
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    trim: true
  },
  year: {
    type: String,
    enum: ['1st', '2nd', '3rd', '4th', '5th'],
    default: '1st'
  },
  // Profile Settings
  currency: {
    type: String,
    default: 'USD'
  },
  dateFormat: {
    type: String,
    default: 'MM/DD/YYYY'
  },
  language: {
    type: String,
    default: 'English'
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  // Financial Settings
  incomeFrequency: {
    type: String,
    default: 'Monthly'
  },
  incomeSources: {
    type: String,
    default: ''
  },
  priorities: {
    type: String,
    default: 'Saving'
  },
  riskTolerance: {
    type: String,
    default: 'Moderate'
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  refreshTokenHash: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ studentId: 1 }, { unique: true });

userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string', $ne: '' } } }
);

userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

userSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.statics.generateStudentId = function () {
  return `STU${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
};

userSchema.statics.createWithUniqueStudentId = async function (data, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const studentId = this.generateStudentId();
      return await this.create({ ...data, studentId });
    } catch (error) {
      const isDuplicateStudentId = error?.code === 11000 && error?.keyPattern?.studentId;
      if (!isDuplicateStudentId || attempt == maxRetries - 1) {
        throw error;
      }
    }
  }

  throw new Error('Failed to generate a unique student ID');
};

userSchema.statics.saveWithUniqueStudentId = async function (user, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      if (!user.studentId) {
        user.studentId = this.generateStudentId();
      }
      return await user.save();
    } catch (error) {
      const isDuplicateStudentId = error?.code === 11000 && error?.keyPattern?.studentId;
      if (!isDuplicateStudentId || attempt == maxRetries - 1) {
        throw error;
      }
      user.studentId = undefined;
    }
  }

  throw new Error('Failed to generate a unique student ID');
};

module.exports = mongoose.model('User', userSchema);

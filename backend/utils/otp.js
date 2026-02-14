const crypto = require('crypto');

const generateOtp = () => {
  // Use cryptographically secure random integer for security
  const value = crypto.randomInt(100000, 1000000);
  return String(value);
};

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const otpExpiresAt = (minutes = 10) => new Date(Date.now() + minutes * 60 * 1000);

module.exports = {
  generateOtp,
  hashOtp,
  otpExpiresAt
};

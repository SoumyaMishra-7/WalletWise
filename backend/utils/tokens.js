const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '10m';
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '1d';

const signAccessToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'walletwise-access-secret',
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), tokenType: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'walletwise-refresh-secret',
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'walletwise-access-secret');
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'walletwise-refresh-secret');
};

const getTokenExpirationDate = (token) => {
  const payload = jwt.decode(token);
  if (!payload || !payload.exp) {
    return null;
  }
  return new Date(payload.exp * 1000);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES,
  getTokenExpirationDate
};

const jwt = require('jsonwebtoken');
const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '10m';
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '1d';

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET or JWT_SECRET must be set');
  }
  return secret;
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET must be set');
  }
  return secret;
};

const signAccessToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    getAccessSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), tokenType: 'refresh' },
    getRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
};

const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, getAccessSecret());
  if (payload && payload.tokenType === 'refresh') {
    throw new jwt.JsonWebTokenError('Refresh token cannot be used as access token');
  }
  return payload;
};

const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, getRefreshSecret());
  if (payload && payload.tokenType && payload.tokenType !== 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid refresh token type');
  }
  return payload;
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

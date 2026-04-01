const { verifyAccessToken } = require('../utils/tokens');
const currencyMiddleware = require('./currencyConverter.middleware');

const isProd = process.env.NODE_ENV === 'production';

const cookieClearOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/'
};

const protect = (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = verifyAccessToken(token);
    req.userId = decoded.sub;
    req.userEmail = decoded.email;

    // Pipe the request through currency middleware after authentication
    currencyMiddleware(req, res, next);
  } catch (error) {
    // Must pass the same options used when setting the cookie, otherwise
    // the browser ignores the clear in production (secure + sameSite=none).
    res.clearCookie('access_token', cookieClearOptions);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.'
    });
  }
};

module.exports = { protect };

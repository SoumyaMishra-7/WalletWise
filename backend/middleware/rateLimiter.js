const rateLimit = require('express-rate-limit');

// Global Rate Limiter
// Applies to all requests
const globalLimiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes default
    max: process.env.RATE_LIMIT_MAX || 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
});

// Auth Rate Limiter
// Stricter limits for authentication routes to prevent brute-force attacks
const authLimiter = rateLimit({
    windowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes default
    max: process.env.AUTH_RATE_LIMIT_MAX || 20, // Limit each IP to 20 login requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again after 15 minutes',
    },
});

module.exports = { globalLimiter, authLimiter };

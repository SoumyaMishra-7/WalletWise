const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// 1. Total Traffic Limiter (Global Fuse)
// This applies to the entire server regardless of IP.
// It acts as a circuit breaker to prevent total resource exhaustion during a DDoS attack.
const totalTrafficLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 1000, // Limit the entire server to 1000 requests per minute
    standardHeaders: false, // Don't leak this aggregate info in headers
    legacyHeaders: false,
    message: {
        success: false,
        message: 'The server is currently experiencing high traffic. Please try again later.',
    },
    // Custom key generator to apply globally
    keyGenerator: (req, res) => 'global',
});

// 2. Speed Limiter (Throttler)
// Delays responses for IPs that make too many requests.
// Makes botnets and scrapers much less efficient.
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests without delay
    delayMs: (hits) => hits * 100, // Add 100ms delay per hit after the limit
    maxDelayMs: 2000, // Maximum delay of 2 seconds
});

// 3. IP-based Global Rate Limiter
// Standard protection for individual users
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Increased for development
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
});

// 4. Auth Rate Limiter
// Stricter limits for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes default
    max: process.env.NODE_ENV === 'development' ? 5000 : 100, // Increased for dev, stricter for prod
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again after 15 minutes',
    },
});

module.exports = {
    totalTrafficLimiter,
    speedLimiter,
    globalLimiter,
    authLimiter
};

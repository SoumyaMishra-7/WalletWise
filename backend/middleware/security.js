
/**
 * Security Middleware
 */

/**
 * Enforces 'application/json' Content-Type for state-changing requests.
 * This prevents simple HTML forms from triggering API actions (CSRF protection).
 * Standard HTML forms can only send:
 * - application/x-www-form-urlencoded
 * - multipart/form-data
 * - text/plain
 * 
 * By enforcing application/json, we ensure that the request must have triggered
 * a CORS preflight, which the browser security model handles.
 */
const enforceJsonContent = (req, res, next) => {
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    // Skip if method is safe
    if (!stateChangingMethods.includes(req.method)) {
        return next();
    }

    // Skip if content-type is json
    if (req.is('application/json')) {
        return next();
    }

    // Allow multipart/form-data exclusively for the profile update endpoint
    if (req.is('multipart/form-data') && req.originalUrl.split('?')[0].endsWith('/auth/profile')) {
        return next();
    }

    // Reject other content types
    return res.status(415).json({
        success: false,
        message: 'Unsupported Media Type. Information must be sent as application/json to prevent CSRF.',
        error: 'CSRF_PROTECTION_ENFORCED'
    });
};

module.exports = {
    enforceJsonContent
};

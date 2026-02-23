
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

    // Skip if content-type is json or multipart/form-data
    if (req.is('application/json') || req.is('multipart/form-data')) {
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

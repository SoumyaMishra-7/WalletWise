// Async handler middleware to properly forward async errors to Express error handling
const asyncHandler = (fn) => {
    return (req, res, next) => {
        // Ensure that any promise rejection from the wrapped async function is caught
        // and passed to next() for centralized error handling.
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = asyncHandler;
/**
 * Wrapper for async controller functions to catch errors and pass them to next()
 */
/**
 * Wrap an async Express route handler and forward any rejected promise to
 * Express error‑handling middleware via `next`.
 *
 * This ensures that unhandled rejections are caught uniformly without the
 * need for explicit try/catch blocks in each controller.
 */
module.exports = fn => {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};

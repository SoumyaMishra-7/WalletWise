/**
 * Wrapper for async controller functions to catch errors and pass them to next()
 */
module.exports = fn => {
  return (req, res, next) => {
    return fn(req, res, next).catch(err => {
      if (typeof next === 'function') {
        next(err);
      } else {
        throw err;
      }
    });
  };
};

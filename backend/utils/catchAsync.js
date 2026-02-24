/**
 * Wrapper for async controller functions to catch errors and pass them to next()
 */
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

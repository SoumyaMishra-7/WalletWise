/**
 * Global Error Handling Middleware
 */
const sendErrorDev = (err, req, res) => {
  return res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, req, res) => {
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message
    });
  }

  // B) Programming or other unknown error: don't leak error details
  console.error('❌ ERROR:', err);
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went very wrong!'
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    sendErrorDev(err, req, res);
  } else {
    // Basic mapping for common MongoDB/Mongoose errors
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') {
      const message = `Invalid ${error.path}: ${error.value}.`;
      const AppError = require('../utils/appError');
      error = new AppError(message, 400);
    }

    if (error.code === 11000) {
      const value = Object.values(error.keyValue)[0];
      const message = `Duplicate field value: ${value}. Please use another value!`;
      const AppError = require('../utils/appError');
      error = new AppError(message, 400);
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(el => el.message);
      const message = `Invalid input data. ${messages.join('. ')}`;
      const AppError = require('../utils/appError');
      error = new AppError(message, 400);
    }

    if (error.message && error.message.includes('Transaction numbers are only allowed on a replica set')) {
      const message = 'Database configuration error: Transactions require a Replica Set (Atlas or local-rs).';
      const AppError = require('../utils/appError');
      error = new AppError(message, 500);
    }

    sendErrorProd(error, req, res);
  }
};

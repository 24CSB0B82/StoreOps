const { sendError } = require('../utils/apiResponse');

/**
 * Centralized error-handling middleware.
 * Intercepts all errors thrown in controllers, services, or middleware.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  // Handle specific PostgreSQL error codes
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation (e.g., duplicate email or SKU)
        statusCode = 409;
        errorCode = 'DUPLICATE_RESOURCE';
        message = 'A record with that unique value already exists.';
        if (err.detail) {
          message = err.detail.replace(/Key \((.*?)\)=\((.*?)\) already exists\./, '$1 already exists with value "$2".');
        }
        break;

      case '23503': // Foreign key violation
        statusCode = 409;
        errorCode = 'FOREIGN_KEY_VIOLATION';
        message = 'Operation violates relational integrity constraint.';
        break;

      case '23514': // Check constraint violation
        statusCode = 400;
        errorCode = 'CHECK_CONSTRAINT_FAILED';
        message = 'Provided value violates database validation rules.';
        break;

      case 'ECONNREFUSED':
      case 'ENOTFOUND':
        statusCode = 503;
        errorCode = 'DATABASE_UNAVAILABLE';
        message = 'Database service is currently unreachable.';
        break;

      default:
        // Do not expose raw database internal errors in production
        if (process.env.NODE_ENV !== 'development' && statusCode === 500) {
          message = 'A database error occurred.';
        }
        break;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Authentication token is invalid.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired. Please log in again.';
  }

  // Log server errors for debugging
  if (statusCode >= 500) {
    console.error(`[Unhandled Error] ${req.method} ${req.url}:`, err);
  }

  return sendError(res, message, errorCode, statusCode, err.stack);
};

module.exports = errorHandler;

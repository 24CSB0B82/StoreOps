/**
 * Standardized API response helper functions according to StoreOps Technical Spec Section 9.
 */

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Indicates expected application-level errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Send a standardized success JSON response
 * @param {Response} res - Express response object
 * @param {string} message - Human-readable success message
 * @param {any} data - Response payload
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, message = 'Operation completed successfully', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a standardized error JSON response
 * @param {Response} res - Express response object
 * @param {string} message - Human-readable error description
 * @param {string} errorCode - Machine-readable error code (e.g., 'INSUFFICIENT_STOCK')
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {any} details - Optional extra error details (e.g. validation issues)
 */
const sendError = (res, message = 'An error occurred', errorCode = 'SERVER_ERROR', statusCode = 500, details = null) => {
  const payload = {
    success: false,
    message,
    error: {
      code: errorCode,
    },
  };

  if (details && process.env.NODE_ENV === 'development') {
    payload.error.details = details;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  AppError,
  sendSuccess,
  sendError,
};

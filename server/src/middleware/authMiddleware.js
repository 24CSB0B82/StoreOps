const { verifyToken } = require('../utils/token');
const { AppError } = require('../utils/apiResponse');

/**
 * Middleware: Verifies JWT token from Authorization header
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError('Authentication required. Missing Bearer token.', 401, 'MISSING_TOKEN')
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(
        new AppError('Authentication token has expired. Please log in again.', 401, 'TOKEN_EXPIRED')
      );
    }
    return next(
      new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN')
    );
  }
};

/**
 * Middleware: Enforces Role-Based Access Control
 * @param  {...string} allowedRoles - List of roles permitted (e.g. 'admin', 'staff')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError('Authentication required before checking permissions.', 401, 'UNAUTHENTICATED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: Operation requires one of the following roles: [${allowedRoles.join(', ')}]`,
          403,
          'FORBIDDEN_ROLE'
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
};

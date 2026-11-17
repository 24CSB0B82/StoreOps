const { AppError } = require('../utils/apiResponse');

/**
 * Validates login request body
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return next(new AppError('Email is required.', 400, 'INVALID_INPUT'));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return next(new AppError('Please provide a valid email address.', 400, 'INVALID_EMAIL_FORMAT'));
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return next(new AppError('Password is required.', 400, 'INVALID_INPUT'));
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

module.exports = {
  validateLogin,
};

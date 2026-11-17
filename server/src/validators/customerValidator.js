const { AppError } = require('../utils/apiResponse');

/**
 * Validates customer creation and update payload
 */
const validateCustomer = (req, res, next) => {
  const { customer_name, email, phone } = req.body;

  if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
    return next(new AppError('Customer name is required.', 400, 'INVALID_INPUT'));
  }

  if (email && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return next(new AppError('Please provide a valid email address.', 400, 'INVALID_EMAIL'));
    }
  }

  req.body.customer_name = customer_name.trim();
  if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();
  if (req.body.phone) req.body.phone = req.body.phone.trim();

  next();
};

module.exports = {
  validateCustomer,
};

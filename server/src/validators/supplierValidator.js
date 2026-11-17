const { AppError } = require('../utils/apiResponse');

/**
 * Validates supplier creation and update payload
 */
const validateSupplier = (req, res, next) => {
  const { supplier_name, email, phone } = req.body;

  if (!supplier_name || typeof supplier_name !== 'string' || !supplier_name.trim()) {
    return next(new AppError('Supplier name is required.', 400, 'INVALID_INPUT'));
  }

  if (email && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return next(new AppError('Please provide a valid email address.', 400, 'INVALID_EMAIL'));
    }
  }

  req.body.supplier_name = supplier_name.trim();
  if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();
  if (req.body.phone) req.body.phone = req.body.phone.trim();
  if (req.body.address) req.body.address = req.body.address.trim();

  next();
};

module.exports = {
  validateSupplier,
};

const { AppError } = require('../utils/apiResponse');

/**
 * Validates stock adjustment payload
 */
const validateStockAdjustment = (req, res, next) => {
  const { product_id, quantity_changed, transaction_type, reason } = req.body;

  if (!product_id || isNaN(Number(product_id)) || Number(product_id) <= 0) {
    return next(new AppError('A valid product ID is required.', 400, 'INVALID_PRODUCT_ID'));
  }

  const numChange = Number(quantity_changed);
  if (quantity_changed === undefined || isNaN(numChange) || !Number.isInteger(numChange) || numChange === 0) {
    return next(new AppError('Quantity changed must be a non-zero integer (positive to add, negative to deduct).', 400, 'INVALID_QUANTITY_CHANGE'));
  }

  const allowedTypes = ['STOCK_IN', 'ADJUSTMENT', 'STOCK_OUT'];
  if (transaction_type && !allowedTypes.includes(transaction_type)) {
    return next(new AppError(`Transaction type must be one of: [${allowedTypes.join(', ')}]`, 400, 'INVALID_TRANSACTION_TYPE'));
  }

  req.body.product_id = Number(product_id);
  req.body.quantity_changed = numChange;
  req.body.transaction_type = transaction_type || (numChange > 0 ? 'STOCK_IN' : 'ADJUSTMENT');
  if (reason) req.body.reason = String(reason).trim();

  next();
};

module.exports = {
  validateStockAdjustment,
};

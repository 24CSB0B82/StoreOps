const { AppError } = require('../utils/apiResponse');

/**
 * Validates product creation and update payloads
 */
const validateProduct = (req, res, next) => {
  const { product_name, sku, price, quantity, reorder_level, supplier_id } = req.body;

  // Validation for product_name
  if (!product_name || typeof product_name !== 'string' || !product_name.trim()) {
    return next(new AppError('Product name is required.', 400, 'INVALID_INPUT'));
  }

  // Validation for SKU
  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    return next(new AppError('SKU is required.', 400, 'INVALID_INPUT'));
  }

  // Validation for price
  const numPrice = Number(price);
  if (price === undefined || isNaN(numPrice) || numPrice < 0) {
    return next(new AppError('Price must be a non-negative number.', 400, 'INVALID_PRICE'));
  }

  // Validation for quantity
  if (quantity !== undefined) {
    const numQty = Number(quantity);
    if (isNaN(numQty) || !Number.isInteger(numQty) || numQty < 0) {
      return next(new AppError('Quantity must be a non-negative integer.', 400, 'INVALID_QUANTITY'));
    }
  }

  // Validation for reorder_level
  if (reorder_level !== undefined) {
    const numReorder = Number(reorder_level);
    if (isNaN(numReorder) || !Number.isInteger(numReorder) || numReorder < 0) {
      return next(new AppError('Reorder level must be a non-negative integer.', 400, 'INVALID_REORDER_LEVEL'));
    }
  }

  // Validation for supplier_id
  if (supplier_id !== undefined && supplier_id !== null) {
    const numSupplier = Number(supplier_id);
    if (isNaN(numSupplier) || !Number.isInteger(numSupplier) || numSupplier <= 0) {
      return next(new AppError('Invalid supplier ID.', 400, 'INVALID_SUPPLIER_ID'));
    }
  }

  // Clean payload
  req.body.product_name = product_name.trim();
  req.body.sku = sku.trim().toUpperCase();
  req.body.price = numPrice;
  req.body.quantity = quantity !== undefined ? Number(quantity) : 0;
  req.body.reorder_level = reorder_level !== undefined ? Number(reorder_level) : 10;
  if (req.body.description) req.body.description = req.body.description.trim();
  if (req.body.category) req.body.category = req.body.category.trim();

  next();
};

/**
 * Validates status toggle payload
 */
const validateStatusToggle = (req, res, next) => {
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return next(new AppError('is_active must be a boolean (true or false).', 400, 'INVALID_STATUS'));
  }

  next();
};

module.exports = {
  validateProduct,
  validateStatusToggle,
};

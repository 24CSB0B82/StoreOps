const { AppError } = require('../utils/apiResponse');

/**
 * Validates order creation payload
 */
const validateCreateOrder = (req, res, next) => {
  const { customer_id, items } = req.body;

  if (!customer_id || isNaN(Number(customer_id)) || Number(customer_id) <= 0) {
    return next(new AppError('A valid customer ID is required.', 400, 'INVALID_CUSTOMER_ID'));
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError('Order must contain at least one item.', 400, 'EMPTY_ORDER_ITEMS'));
  }

  const sanitizedItems = [];
  const seenProducts = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!item.product_id || isNaN(Number(item.product_id)) || Number(item.product_id) <= 0) {
      return next(new AppError(`Item at index ${i} has an invalid product ID.`, 400, 'INVALID_PRODUCT_ID'));
    }

    const qty = Number(item.quantity);
    if (!item.quantity || isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
      return next(new AppError(`Item at index ${i} must have a positive integer quantity (> 0).`, 400, 'INVALID_QUANTITY'));
    }

    if (seenProducts.has(item.product_id)) {
      return next(new AppError(`Duplicate product ID ${item.product_id} in order. Consolidate into a single line item.`, 400, 'DUPLICATE_ORDER_PRODUCT'));
    }
    seenProducts.add(item.product_id);

    sanitizedItems.push({
      product_id: Number(item.product_id),
      quantity: qty,
    });
  }

  req.body.customer_id = Number(customer_id);
  req.body.items = sanitizedItems;
  next();
};

/**
 * Validates order status update payload
 */
const validateOrderStatus = (req, res, next) => {
  const { status } = req.body;
  const allowedStatuses = ['COMPLETED'];

  if (!status || !allowedStatuses.includes(status)) {
    return next(
      new AppError(
        `Invalid status update. Permitted transitions via this endpoint: [${allowedStatuses.join(', ')}]. Use /orders/:id/cancel for cancellations.`,
        400,
        'INVALID_STATUS_TRANSITION'
      )
    );
  }

  next();
};

module.exports = {
  validateCreateOrder,
  validateOrderStatus,
};

const inventoryService = require('../services/inventoryService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/v1/inventory
 */
const getInventory = async (req, res, next) => {
  try {
    const { search, category, stock_status, page, limit } = req.query;
    const result = await inventoryService.getInventory({ search, category, stock_status, page, limit });
    return sendSuccess(res, 'Inventory retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/inventory/low-stock
 */
const getLowStock = async (req, res, next) => {
  try {
    const products = await inventoryService.getLowStockProducts();
    return sendSuccess(res, 'Low stock products retrieved successfully', { products, count: products.length }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/inventory/transactions
 */
const getTransactions = async (req, res, next) => {
  try {
    const { product_id, transaction_type, page, limit } = req.query;
    const result = await inventoryService.getInventoryTransactions({
      product_id,
      transaction_type,
      page,
      limit,
    });
    return sendSuccess(res, 'Inventory history retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/inventory/adjustments
 */
const adjustStock = async (req, res, next) => {
  try {
    const result = await inventoryService.adjustStock(req.body, req.user.userId);
    return sendSuccess(res, 'Stock adjusted successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getLowStock,
  getTransactions,
  adjustStock,
};

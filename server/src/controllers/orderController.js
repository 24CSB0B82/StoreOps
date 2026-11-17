const orderService = require('../services/orderService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/v1/orders
 */
const getOrders = async (req, res, next) => {
  try {
    const { search, status, page, limit } = req.query;
    const result = await orderService.getOrders({ search, status, page, limit });
    return sendSuccess(res, 'Orders retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/orders/:id
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    return sendSuccess(res, 'Order details retrieved successfully', { order }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body, req.user.userId);
    return sendSuccess(res, 'Order placed successfully', { order }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/orders/:id/status
 */
const updateStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
    return sendSuccess(res, `Order #${req.params.id} marked as ${req.body.status}`, { order }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/orders/:id/cancel
 */
const cancelOrder = async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(req.params.id, req.user.userId);
    return sendSuccess(res, `Order #${req.params.id} successfully cancelled and stock restored`, { order }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateStatus,
  cancelOrder,
};

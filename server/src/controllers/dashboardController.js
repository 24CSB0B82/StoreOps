const dashboardService = require('../services/dashboardService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/v1/dashboard/summary
 */
const getSummary = async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary();
    return sendSuccess(res, 'Dashboard summary retrieved successfully', summary, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/dashboard/top-products
 */
const getTopProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const topProducts = await dashboardService.getTopSellingProducts(limit);
    return sendSuccess(res, 'Top selling products retrieved successfully', { topProducts }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/dashboard/recent-orders
 */
const getRecentOrders = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const recentOrders = await dashboardService.getRecentOrders(limit);
    return sendSuccess(res, 'Recent orders retrieved successfully', { recentOrders }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/dashboard/monthly-sales
 */
const getMonthlySales = async (req, res, next) => {
  try {
    const monthlySales = await dashboardService.getMonthlySales();
    return sendSuccess(res, 'Monthly sales retrieved successfully', { monthlySales }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getTopProducts,
  getRecentOrders,
  getMonthlySales,
};

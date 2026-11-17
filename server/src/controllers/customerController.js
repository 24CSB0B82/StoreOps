const customerService = require('../services/customerService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/v1/customers
 */
const getCustomers = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const result = await customerService.getCustomers({ search, page, limit });
    return sendSuccess(res, 'Customers retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers/:id
 */
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    return sendSuccess(res, 'Customer details retrieved successfully', { customer }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/customers
 */
const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return sendSuccess(res, 'Customer created successfully', { customer }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/customers/:id
 */
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    return sendSuccess(res, 'Customer updated successfully', { customer }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
};

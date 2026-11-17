const supplierService = require('../services/supplierService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/v1/suppliers
 */
const getSuppliers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const suppliers = await supplierService.getSuppliers({ search });
    return sendSuccess(res, 'Suppliers retrieved successfully', { suppliers }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/suppliers/:id
 */
const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await supplierService.getSupplierById(req.params.id);
    return sendSuccess(res, 'Supplier details retrieved successfully', { supplier }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/suppliers
 */
const createSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    return sendSuccess(res, 'Supplier created successfully', { supplier }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/suppliers/:id
 */
const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    return sendSuccess(res, 'Supplier updated successfully', { supplier }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
};

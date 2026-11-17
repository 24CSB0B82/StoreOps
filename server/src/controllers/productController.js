const productService = require('../services/productService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/v1/products
 */
const getProducts = async (req, res, next) => {
  try {
    const { search, category, stock_status, is_active, page, limit } = req.query;
    const result = await productService.getProducts({
      search,
      category,
      stock_status,
      is_active,
      page,
      limit,
    });

    return sendSuccess(res, 'Products retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return sendSuccess(res, 'Product details retrieved successfully', { product }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/products
 */
const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body, req.user.userId);
    return sendSuccess(res, 'Product created successfully', { product }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return sendSuccess(res, 'Product updated successfully', { product }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/products/:id/status
 */
const toggleStatus = async (req, res, next) => {
  try {
    const product = await productService.toggleProductStatus(req.params.id, req.body.is_active);
    const statusText = req.body.is_active ? 'activated' : 'deactivated';
    return sendSuccess(res, `Product successfully ${statusText}`, { product }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleStatus,
};

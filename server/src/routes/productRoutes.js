const express = require('express');
const productController = require('../controllers/productController');
const { validateProduct, validateStatusToggle } = require('../validators/productValidator');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All product routes require valid JWT authentication
router.use(authenticateToken);

// Read routes (available to both admin and staff)
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin-only modification routes
router.post('/', requireRole('admin'), validateProduct, productController.createProduct);
router.put('/:id', requireRole('admin'), validateProduct, productController.updateProduct);
router.patch('/:id/status', requireRole('admin'), validateStatusToggle, productController.toggleStatus);

module.exports = router;

const express = require('express');
const orderController = require('../controllers/orderController');
const { validateCreateOrder, validateOrderStatus } = require('../validators/orderValidator');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Require JWT for all order endpoints
router.use(authenticateToken);

// Order listing & details (accessible by both admin & staff)
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);

// Order creation (accessible by both admin & staff)
router.post('/', validateCreateOrder, orderController.createOrder);

// Order status update (e.g. mark PLACED as COMPLETED)
router.patch('/:id/status', validateOrderStatus, orderController.updateStatus);

// Order cancellation (admin-only recommended for financial & stock integrity)
router.post('/:id/cancel', requireRole('admin'), orderController.cancelOrder);

module.exports = router;

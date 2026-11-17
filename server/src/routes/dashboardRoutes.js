const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/summary', dashboardController.getSummary);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/recent-orders', dashboardController.getRecentOrders);
router.get('/monthly-sales', dashboardController.getMonthlySales);

module.exports = router;

const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { validateStockAdjustment } = require('../validators/inventoryValidator');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// View routes
router.get('/', inventoryController.getInventory);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/transactions', inventoryController.getTransactions);

// Admin-only stock adjustment
router.post('/adjustments', requireRole('admin'), validateStockAdjustment, inventoryController.adjustStock);

module.exports = router;

const express = require('express');
const supplierController = require('../controllers/supplierController');
const { validateSupplier } = require('../validators/supplierValidator');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// Read routes
router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplierById);

// Admin-only modification routes
router.post('/', requireRole('admin'), validateSupplier, supplierController.createSupplier);
router.put('/:id', requireRole('admin'), validateSupplier, supplierController.updateSupplier);

module.exports = router;

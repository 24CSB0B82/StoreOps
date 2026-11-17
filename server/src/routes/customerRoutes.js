const express = require('express');
const customerController = require('../controllers/customerController');
const { validateCustomer } = require('../validators/customerValidator');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', validateCustomer, customerController.createCustomer);
router.put('/:id', validateCustomer, customerController.updateCustomer);

module.exports = router;

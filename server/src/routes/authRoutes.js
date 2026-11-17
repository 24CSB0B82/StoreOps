const express = require('express');
const authController = require('../controllers/authController');
const { validateLogin } = require('../validators/authValidator');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();

// Public routes
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);

// Protected routes (requires valid JWT)
router.get('/me', authenticateToken, authController.getMe);

// Admin-only verification route (for role authorization testing)
router.get('/admin-check', authenticateToken, requireRole('admin'), (req, res) => {
  return sendSuccess(res, 'Administrator access confirmed', { user: req.user });
});

module.exports = router;

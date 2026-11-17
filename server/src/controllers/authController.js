const authService = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const authData = await authService.login(email, password);

    return sendSuccess(res, 'Login successful', authData, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    return sendSuccess(res, 'User profile retrieved', { user }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  // Stateless JWT logout is handled on client by clearing local storage.
  // The server responds with confirmation.
  return sendSuccess(res, 'Logout successful. Client session cleared.', {}, 200);
};

module.exports = {
  login,
  getMe,
  logout,
};

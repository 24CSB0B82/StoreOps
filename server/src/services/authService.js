const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { generateToken } = require('../utils/token');
const { AppError } = require('../utils/apiResponse');

/**
 * Authenticates user credentials and generates a JWT
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} { token, user }
 */
const login = async (email, password) => {
  // 1. Fetch user by email
  const result = await query(
    'SELECT user_id, name, email, password_hash, role, created_at FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];

  // 2. Validate user existence
  if (!user) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  // 3. Verify password hash using bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  // 4. Generate JWT
  const token = generateToken(user);

  // 5. Exclude password_hash from response
  const sanitizedUser = {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };

  return {
    token,
    user: sanitizedUser,
  };
};

/**
 * Retrieves the authenticated user's current profile
 * @param {number} userId
 * @returns {Promise<Object>} user
 */
const getCurrentUser = async (userId) => {
  const result = await query(
    'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1',
    [userId]
  );

  const user = result.rows[0];
  if (!user) {
    throw new AppError('User account not found.', 404, 'USER_NOT_FOUND');
  }

  return user;
};

module.exports = {
  login,
  getCurrentUser,
};

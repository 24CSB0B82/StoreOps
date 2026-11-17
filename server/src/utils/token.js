const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'storeops_super_secret_jwt_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Generate a signed JWT token
 * @param {Object} user - User object containing user_id, email, role, name
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  const payload = {
    userId: user.user_id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify a JWT token
 * @param {string} token - Bearer JWT token string
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};

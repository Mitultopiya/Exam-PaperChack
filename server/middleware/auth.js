const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/helpers');

// Verifies the JWT from the Authorization header and attaches the admin payload.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication token missing'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

module.exports = { authenticate };

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminModel = require('../models/adminModel');
const { asyncHandler, ApiError } = require('../utils/helpers');

// POST /api/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const admin = await AdminModel.findByEmail(email);
  if (!admin) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
});

// POST /api/logout — stateless JWT, handled client-side. Provided for completeness.
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/me — returns the currently authenticated admin.
const me = asyncHandler(async (req, res) => {
  const admin = await AdminModel.findById(req.admin.id);
  if (!admin) throw new ApiError(404, 'Admin not found');
  res.json({ success: true, admin });
});

module.exports = { login, logout, me };

const StudentModel = require('../models/studentModel');
const { asyncHandler, ApiError } = require('../utils/helpers');

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body) {
  const { name, email, enrollment_no } = body;
  if (!name || !email || !enrollment_no) {
    throw new ApiError(400, 'Name, email and enrollment number are required');
  }
  if (!emailRe.test(email)) {
    throw new ApiError(400, 'Invalid email address');
  }
}

// GET /api/students
const getStudents = asyncHandler(async (req, res) => {
  const students = await StudentModel.findAll({ search: req.query.search });
  res.json({ success: true, data: students });
});

// GET /api/students/:id
const getStudent = asyncHandler(async (req, res) => {
  const student = await StudentModel.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  res.json({ success: true, data: student });
});

// POST /api/students
const createStudent = asyncHandler(async (req, res) => {
  validate(req.body);
  try {
    const student = await StudentModel.create(req.body);
    res.status(201).json({ success: true, message: 'Student created', data: student });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, 'A student with this email or enrollment number already exists');
    }
    throw err;
  }
});

// PUT /api/students/:id
const updateStudent = asyncHandler(async (req, res) => {
  validate(req.body);
  const existing = await StudentModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Student not found');
  try {
    const student = await StudentModel.update(req.params.id, req.body);
    res.json({ success: true, message: 'Student updated', data: student });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, 'A student with this email or enrollment number already exists');
    }
    throw err;
  }
});

// DELETE /api/students/:id
const deleteStudent = asyncHandler(async (req, res) => {
  const ok = await StudentModel.remove(req.params.id);
  if (!ok) throw new ApiError(404, 'Student not found');
  res.json({ success: true, message: 'Student deleted' });
});

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent };

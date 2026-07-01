const ExamModel = require('../models/examModel');
const { asyncHandler, ApiError } = require('../utils/helpers');

function validate(body) {
  const { title, subject, total_questions, total_marks, pass_marks } = body;
  if (!title || !subject) {
    throw new ApiError(400, 'Title and subject are required');
  }
  if (!total_questions || total_questions < 1) {
    throw new ApiError(400, 'Total questions must be at least 1');
  }
  if (total_marks === undefined || total_marks < 0) {
    throw new ApiError(400, 'Total marks is required');
  }
  if (pass_marks === undefined || pass_marks < 0 || pass_marks > total_marks) {
    throw new ApiError(400, 'Passing marks must be between 0 and total marks');
  }
}

// GET /api/exams
const getExams = asyncHandler(async (req, res) => {
  const exams = await ExamModel.findAll({
    search: req.query.search,
    status: req.query.status,
  });
  res.json({ success: true, data: exams });
});

// GET /api/exams/:id
const getExam = asyncHandler(async (req, res) => {
  const exam = await ExamModel.findById(req.params.id);
  if (!exam) throw new ApiError(404, 'Exam not found');
  res.json({ success: true, data: exam });
});

// POST /api/exams
const createExam = asyncHandler(async (req, res) => {
  validate(req.body);
  const exam = await ExamModel.create(req.body);
  res.status(201).json({ success: true, message: 'Exam created', data: exam });
});

// PUT /api/exams/:id
const updateExam = asyncHandler(async (req, res) => {
  validate(req.body);
  const existing = await ExamModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Exam not found');
  const exam = await ExamModel.update(req.params.id, req.body);
  res.json({ success: true, message: 'Exam updated', data: exam });
});

// PATCH /api/exams/:id/status
const toggleStatus = asyncHandler(async (req, res) => {
  const existing = await ExamModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Exam not found');
  const status = existing.status === 'active' ? 'inactive' : 'active';
  const exam = await ExamModel.setStatus(req.params.id, status);
  res.json({ success: true, message: `Exam ${status}`, data: exam });
});

// DELETE /api/exams/:id
const deleteExam = asyncHandler(async (req, res) => {
  const ok = await ExamModel.remove(req.params.id);
  if (!ok) throw new ApiError(404, 'Exam not found');
  res.json({ success: true, message: 'Exam deleted' });
});

module.exports = { getExams, getExam, createExam, updateExam, toggleStatus, deleteExam };

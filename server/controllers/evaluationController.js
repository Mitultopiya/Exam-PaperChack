const fs = require('fs');
const path = require('path');
const ExamModel = require('../models/examModel');
const StudentModel = require('../models/studentModel');
const AnswerKeyModel = require('../models/answerKeyModel');
const ResultModel = require('../models/resultModel');
const SubmissionModel = require('../models/submissionModel');
const { evaluate } = require('../services/evaluationService');
const { parseFile, parseAnswersObject } = require('../services/answerParser');
const { generateResultPdf } = require('../services/pdfService');
const { asyncHandler, ApiError } = require('../utils/helpers');

// POST /api/evaluate
// Accepts multipart form-data with optional `file`, plus student_id and exam_id.
// Alternatively accepts JSON body with `answers` (manually entered).
const evaluatePaper = asyncHandler(async (req, res) => {
  const student_id = req.body.student_id;
  const exam_id = req.body.exam_id;

  if (!student_id || !exam_id) {
    throw new ApiError(400, 'student_id and exam_id are required');
  }

  const [student, exam] = await Promise.all([
    StudentModel.findById(student_id),
    ExamModel.findById(exam_id),
  ]);
  if (!student) throw new ApiError(404, 'Student not found');
  if (!exam) throw new ApiError(404, 'Exam not found');

  const keyMap = await AnswerKeyModel.getKeyMap(exam_id);
  if (Object.keys(keyMap).length === 0) {
    throw new ApiError(400, 'No answer key found for this exam. Please create one first.');
  }

  // Determine the source of student answers.
  let studentMap = {};
  let uploadedFile = null;

  if (req.file) {
    uploadedFile = req.file.filename;
    studentMap = await parseFile(req.file.path);
  } else if (req.body.answers) {
    studentMap = parseAnswersObject(req.body.answers);
  } else {
    throw new ApiError(400, 'Provide either an answer file or an answers object');
  }

  if (Object.keys(studentMap).length === 0) {
    throw new ApiError(
      400,
      'No selected answers were found in the submission. The file must list the ' +
        "student's chosen option per question (e.g. \"1: A\", \"2: C\"). " +
        'A blank question paper contains no answers — use a filled answer sheet or the Manual Entry tab.'
    );
  }

  // Record the submission.
  const submission_id = await SubmissionModel.create({
    student_id,
    exam_id,
    uploaded_file: uploadedFile,
  });

  // Run the evaluation engine.
  const summary = evaluate({ exam, keyMap, studentMap });

  // Persist the result.
  const result = await ResultModel.create({
    student_id,
    exam_id,
    submission_id,
    correct_answers: summary.correct_answers,
    wrong_answers: summary.wrong_answers,
    skipped_answers: summary.skipped_answers,
    marks: summary.marks,
    percentage: summary.percentage,
    grade: summary.grade,
    status: summary.status,
    details_json: summary.details,
  });

  res.status(201).json({
    success: true,
    message: 'Evaluation completed',
    data: { ...result, details_json: summary.details },
  });
});

// GET /api/results — list with filters.
const getResults = asyncHandler(async (req, res) => {
  const results = await ResultModel.findAll(req.query);
  res.json({ success: true, data: results });
});

// GET /api/result/:id
const getResult = asyncHandler(async (req, res) => {
  const result = await ResultModel.findById(req.params.id);
  if (!result) throw new ApiError(404, 'Result not found');
  result.details_json = JSON.parse(result.details_json || '[]');
  res.json({ success: true, data: result });
});

// DELETE /api/result/:id
const deleteResult = asyncHandler(async (req, res) => {
  const ok = await ResultModel.remove(req.params.id);
  if (!ok) throw new ApiError(404, 'Result not found');
  res.json({ success: true, message: 'Result deleted' });
});

// GET /api/result/:id/pdf — generate (if needed) and stream the report.
const downloadResultPdf = asyncHandler(async (req, res) => {
  const result = await ResultModel.findById(req.params.id);
  if (!result) throw new ApiError(404, 'Result not found');

  let pdfPath = result.pdf_path;
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    pdfPath = await generateResultPdf(result);
    await ResultModel.setPdfPath(result.id, pdfPath);
  }

  const downloadName = `Result_${result.enrollment_no}_${result.exam_title}.pdf`.replace(
    /[^a-z0-9_.\-]/gi,
    '_'
  );
  res.download(path.resolve(pdfPath), downloadName);
});

module.exports = {
  evaluatePaper,
  getResults,
  getResult,
  deleteResult,
  downloadResultPdf,
};

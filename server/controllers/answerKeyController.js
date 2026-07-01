const AnswerKeyModel = require('../models/answerKeyModel');
const ExamModel = require('../models/examModel');
const { asyncHandler, ApiError, normalizeAnswer } = require('../utils/helpers');

// GET /api/answer-keys?exam_id=1
const getAnswerKeys = asyncHandler(async (req, res) => {
  const { exam_id } = req.query;
  if (!exam_id) throw new ApiError(400, 'exam_id query parameter is required');
  const keys = await AnswerKeyModel.findByExam(exam_id);
  res.json({ success: true, data: keys });
});

// POST /api/answer-keys — bulk create/replace the answer key for an exam.
// Body: { exam_id, answers: [{ question_no, correct_answer }, ...] }
const saveAnswerKeys = asyncHandler(async (req, res) => {
  const { exam_id, answers } = req.body;
  if (!exam_id) throw new ApiError(400, 'exam_id is required');
  if (!Array.isArray(answers)) throw new ApiError(400, 'answers must be an array');

  const exam = await ExamModel.findById(exam_id);
  if (!exam) throw new ApiError(404, 'Exam not found');

  // Keep only answered questions within the valid range, normalized.
  const cleaned = answers
    .filter((a) => a && a.question_no && a.correct_answer)
    .map((a) => ({
      question_no: parseInt(a.question_no, 10),
      correct_answer: normalizeAnswer(a.correct_answer),
    }))
    .filter((a) => a.question_no >= 1 && a.question_no <= exam.total_questions);

  const saved = await AnswerKeyModel.replaceForExam(exam_id, cleaned);
  res.json({ success: true, message: 'Answer key saved', data: saved });
});

// PUT /api/answer-keys/:id — update a single answer.
const updateAnswerKey = asyncHandler(async (req, res) => {
  const { correct_answer } = req.body;
  if (!correct_answer) throw new ApiError(400, 'correct_answer is required');
  const updated = await AnswerKeyModel.updateOne(req.params.id, normalizeAnswer(correct_answer));
  if (!updated) throw new ApiError(404, 'Answer key entry not found');
  res.json({ success: true, message: 'Answer updated', data: updated });
});

// DELETE /api/answer-keys/:id — here :id is the exam id (clears the key).
const deleteAnswerKey = asyncHandler(async (req, res) => {
  const removed = await AnswerKeyModel.removeByExam(req.params.id);
  res.json({ success: true, message: `Removed ${removed} answer key entries` });
});

module.exports = { getAnswerKeys, saveAnswerKeys, updateAnswerKey, deleteAnswerKey };

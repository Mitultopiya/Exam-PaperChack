/**
 * SubjectiveController — HTTP layer for AI evaluation (master keys + student PDFs).
 * Delegates business logic to service classes; handles request/response only.
 */
const path = require('path');
const fs = require('fs');
const MasterKeyModel = require('../models/masterKeyModel');
const SubjectiveModel = require('../models/subjectiveModel');
const masterKeyService = require('../services/masterKeyService');
const subjectiveEvaluationService = require('../services/subjectiveEvaluationService');
const { asyncHandler, ApiError } = require('../utils/helpers');

/** POST /api/subjective/master-key */
const uploadMasterKey = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'PDF file is required');

  const title = req.body.title || req.file.originalname.replace(/\.pdf$/i, '');
  const { message, data } = await masterKeyService.uploadMasterKey({
    title,
    filePath: req.file.path,
  });

  res.status(201).json({ success: true, message, data });
});

/** POST /api/subjective/master-keys/:id/answers */
const saveMasterAnswers = asyncHandler(async (req, res) => {
  const data = await masterKeyService.saveMasterAnswers(req.params.id, req.body.answers);
  res.json({ success: true, message: 'Answer key saved', data });
});

/** GET /api/subjective/master-keys */
const listMasterKeys = asyncHandler(async (req, res) => {
  const keys = await MasterKeyModel.findAll();
  res.json({ success: true, data: keys });
});

/** GET /api/subjective/master-keys/:id */
const getMasterKey = asyncHandler(async (req, res) => {
  const master = await MasterKeyModel.findById(req.params.id);
  if (!master) throw new ApiError(404, 'Master answer key not found');
  const questions = await MasterKeyModel.getQuestions(master.id);
  res.json({ success: true, data: { ...master, questions } });
});

/** DELETE /api/subjective/master-keys/:id */
const deleteMasterKey = asyncHandler(async (req, res) => {
  const ok = await MasterKeyModel.remove(req.params.id);
  if (!ok) throw new ApiError(404, 'Master answer key not found');
  res.json({ success: true, message: 'Master answer key deleted' });
});

/** POST /api/subjective/master-keys/:id/re-extract */
const reExtractMasterKey = asyncHandler(async (req, res) => {
  const { message, data } = await masterKeyService.reExtractMasterKey(req.params.id);
  res.json({ success: true, message, data });
});

/** POST /api/subjective/evaluate */
const evaluateStudent = asyncHandler(async (req, res) => {
  const { message, data } = await subjectiveEvaluationService.evaluateStudent({
    masterKeyId: req.body.master_key_id,
    studentName: req.body.student_name,
    studentPdfPath: req.file?.path,
  });
  res.status(201).json({ success: true, message, data });
});

/** GET /api/subjective/results */
const listResults = asyncHandler(async (req, res) => {
  const results = await SubjectiveModel.findAll();
  res.json({ success: true, data: results });
});

/** GET /api/subjective/results/:id */
const getResult = asyncHandler(async (req, res) => {
  const result = await SubjectiveModel.findById(req.params.id);
  if (!result) throw new ApiError(404, 'Result not found');

  let parsed = JSON.parse(result.details_json || '{}');
  if (Array.isArray(parsed)) {
    result.details_json = parsed;
    result.meta = {};
  } else {
    result.details_json = parsed.details || [];
    result.meta = parsed.meta || {};
  }

  res.json({ success: true, data: result });
});

/** GET /api/subjective/results/:id/download */
const downloadMarkedPdf = asyncHandler(async (req, res) => {
  const result = await SubjectiveModel.findById(req.params.id);
  if (!result) throw new ApiError(404, 'Result not found');
  if (!result.marked_pdf_path || !fs.existsSync(result.marked_pdf_path)) {
    throw new ApiError(404, 'Marked PDF not found');
  }

  const name = `Checked_${result.student_name || 'Student'}_${result.master_title}.pdf`.replace(
    /[^a-z0-9_.\-]/gi,
    '_'
  );
  res.download(path.resolve(result.marked_pdf_path), name);
});

/** DELETE /api/subjective/results/:id */
const deleteResult = asyncHandler(async (req, res) => {
  const ok = await SubjectiveModel.remove(req.params.id);
  if (!ok) throw new ApiError(404, 'Result not found');
  res.json({ success: true, message: 'Result deleted' });
});

module.exports = {
  uploadMasterKey,
  saveMasterAnswers,
  listMasterKeys,
  getMasterKey,
  deleteMasterKey,
  reExtractMasterKey,
  evaluateStudent,
  listResults,
  getResult,
  downloadMarkedPdf,
  deleteResult,
};

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
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
} = require('../controllers/subjectiveController');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../utils/helpers');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const pdfOnly = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') cb(null, true);
    else cb(new ApiError(400, 'Only PDF files are allowed'));
  },
});

const router = express.Router();
router.use(authenticate);

router.post('/master-key', pdfOnly.single('file'), uploadMasterKey);
router.post('/master-keys/:id/answers', saveMasterAnswers);
router.get('/master-keys', listMasterKeys);
router.get('/master-keys/:id', getMasterKey);
router.post('/master-keys/:id/re-extract', reExtractMasterKey);
router.delete('/master-keys/:id', deleteMasterKey);

router.post('/evaluate', pdfOnly.single('file'), evaluateStudent);
router.get('/results', listResults);
router.get('/results/:id', getResult);
router.get('/results/:id/download', downloadMarkedPdf);
router.delete('/results/:id', deleteResult);

module.exports = router;

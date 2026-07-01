const express = require('express');
const {
  evaluatePaper,
  getResults,
  getResult,
  deleteResult,
  downloadResultPdf,
} = require('../controllers/evaluationController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.post('/evaluate', upload.single('file'), evaluatePaper);
router.get('/results', getResults);
router.get('/result/:id', getResult);
router.delete('/result/:id', deleteResult);
router.get('/result/:id/pdf', downloadResultPdf);

module.exports = router;

const express = require('express');
const {
  getExams,
  getExam,
  createExam,
  updateExam,
  toggleStatus,
  deleteExam,
} = require('../controllers/examController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', getExams);
router.get('/:id', getExam);
router.post('/', createExam);
router.put('/:id', updateExam);
router.patch('/:id/status', toggleStatus);
router.delete('/:id', deleteExam);

module.exports = router;

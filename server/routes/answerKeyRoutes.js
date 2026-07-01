const express = require('express');
const {
  getAnswerKeys,
  saveAnswerKeys,
  updateAnswerKey,
  deleteAnswerKey,
} = require('../controllers/answerKeyController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', getAnswerKeys);
router.post('/', saveAnswerKeys);
router.put('/:id', updateAnswerKey);
router.delete('/:id', deleteAnswerKey);

module.exports = router;

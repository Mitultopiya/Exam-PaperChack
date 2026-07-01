const express = require('express');
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', getStudents);
router.get('/:id', getStudent);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;

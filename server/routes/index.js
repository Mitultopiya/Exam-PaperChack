const express = require('express');
const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes');
const examRoutes = require('./examRoutes');
const answerKeyRoutes = require('./answerKeyRoutes');
const evaluationRoutes = require('./evaluationRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const subjectiveRoutes = require('./subjectiveRoutes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

router.use('/', authRoutes); // /login, /logout, /me
router.use('/students', studentRoutes);
router.use('/exams', examRoutes);
router.use('/answer-keys', answerKeyRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/subjective', subjectiveRoutes);
router.use('/', evaluationRoutes); // /evaluate, /results, /result/:id

module.exports = router;

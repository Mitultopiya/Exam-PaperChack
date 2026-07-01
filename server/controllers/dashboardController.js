const ExamModel = require('../models/examModel');
const StudentModel = require('../models/studentModel');
const ResultModel = require('../models/resultModel');
const SubmissionModel = require('../models/submissionModel');
const AnswerKeyModel = require('../models/answerKeyModel');
const { asyncHandler } = require('../utils/helpers');

// GET /api/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalExams,
    totalStudents,
    totalAnswerKeys,
    evaluatedPapers,
    totalSubmissions,
    statusCounts,
    daily,
    examStats,
    recent,
  ] = await Promise.all([
    ExamModel.count(),
    StudentModel.count(),
    AnswerKeyModel.countExamsWithKeys(),
    ResultModel.count(),
    SubmissionModel.count(),
    ResultModel.countByStatus(),
    ResultModel.dailyCounts(7),
    ResultModel.examStats(),
    ResultModel.recent(6),
  ]);

  const totalEvaluated = statusCounts.pass + statusCounts.fail;
  const passPercentage =
    totalEvaluated > 0 ? Number(((statusCounts.pass / totalEvaluated) * 100).toFixed(1)) : 0;

  // Pending = submissions that have not produced a result yet.
  const pendingEvaluations = Math.max(totalSubmissions - evaluatedPapers, 0);

  res.json({
    success: true,
    data: {
      cards: {
        totalExams,
        totalStudents,
        totalAnswerKeys,
        evaluatedPapers,
        pendingEvaluations,
      },
      passFail: statusCounts,
      passPercentage,
      dailyEvaluations: daily,
      examStats,
      recentActivity: recent,
    },
  });
});

module.exports = { getDashboard };

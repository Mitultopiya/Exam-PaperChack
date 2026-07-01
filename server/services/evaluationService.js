const { computeGrade, normalizeAnswer } = require('../utils/helpers');

/**
 * McqEvaluationService — core MCQ evaluation engine (legacy flow).
 * Compares student letter answers against the answer key and computes marks.
 */
class McqEvaluationService {
  /**
   * Compare student answers against the answer key and compute the score.
   *
   * @param {Object} params
   * @param {Object} params.exam        Exam row (total_questions, total_marks, pass_marks, negative_mark).
   * @param {Object} params.keyMap      { question_no: correct_answer }
   * @param {Object} params.studentMap  { question_no: student_answer }
   * @returns {Object} evaluation summary with per-question details.
   */
  evaluate({ exam, keyMap, studentMap }) {
    const totalQuestions = exam.total_questions;
    const totalMarks = Number(exam.total_marks);
    const negativeMark = Number(exam.negative_mark) || 0;
    const passMarks = Number(exam.pass_marks);

    const markPerQuestion = totalQuestions > 0 ? totalMarks / totalQuestions : 0;

    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let marks = 0;

    const details = [];

    for (let q = 1; q <= totalQuestions; q++) {
      const correctAnswer = normalizeAnswer(keyMap[q]);
      const studentAnswer = normalizeAnswer(studentMap[q]);

      let result;
      let awarded = 0;

      if (!studentAnswer) {
        result = 'skipped';
        skipped += 1;
      } else if (studentAnswer === correctAnswer && correctAnswer !== '') {
        result = 'correct';
        correct += 1;
        awarded = markPerQuestion;
        marks += markPerQuestion;
      } else {
        result = 'wrong';
        wrong += 1;
        awarded = -negativeMark;
        marks -= negativeMark;
      }

      details.push({
        question_no: q,
        correct_answer: correctAnswer || '-',
        student_answer: studentAnswer || '-',
        result,
        marks_awarded: Number(awarded.toFixed(2)),
      });
    }

    if (marks < 0) marks = 0;
    marks = Number(marks.toFixed(2));

    const percentage = totalMarks > 0 ? Number(((marks / totalMarks) * 100).toFixed(2)) : 0;
    const grade = computeGrade(percentage);
    const status = marks >= passMarks ? 'pass' : 'fail';

    return {
      correct_answers: correct,
      wrong_answers: wrong,
      skipped_answers: skipped,
      marks,
      percentage,
      grade,
      status,
      total_questions: totalQuestions,
      total_marks: totalMarks,
      pass_marks: passMarks,
      details,
    };
  }
}

const mcqEvaluationService = new McqEvaluationService();

module.exports = {
  McqEvaluationService,
  mcqEvaluationService,
  evaluate: (...args) => mcqEvaluationService.evaluate(...args),
};

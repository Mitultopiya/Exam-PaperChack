/**
 * AnswerComparisonService — local-only answer matching (no paid APIs).
 * Compares student answers against master answers using MCQ letter matching
 * and keyword/token semantic scoring.
 */
class AnswerComparisonService {
  constructor() {
    this.passThreshold = Number(process.env.AI_PASS_THRESHOLD || 80);
  }

  /**
   * Extract the MCQ option letter (A–D) from an answer string.
   */
  extractMcqLetter(answer) {
    const m = String(answer || '').trim().match(/^([A-Da-d])\b/);
    return m ? m[1].toUpperCase() : null;
  }

  /**
   * MCQ fast path: same option letter = 100%, different = 0%.
   */
  mcqLetterScore(teacherAnswer, studentAnswer) {
    const tLetter = this.extractMcqLetter(teacherAnswer);
    const sLetter = this.extractMcqLetter(studentAnswer);
    if (tLetter && sLetter) {
      return tLetter === sLetter ? 100 : 0;
    }
    return null;
  }

  /**
   * Local semantic score using keyword overlap + Jaccard token similarity.
   * Runs entirely offline — no external API calls.
   */
  localSemanticScore(teacherAnswer, studentAnswer, keywords = '') {
    const norm = (s) =>
      String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const t = norm(teacherAnswer);
    const s = norm(studentAnswer);
    if (!t || !s) return 0;
    if (t === s) return 100;

    const tTokens = new Set(t.split(' ').filter((w) => w.length > 2));
    const sTokens = new Set(s.split(' ').filter((w) => w.length > 2));
    let overlap = 0;
    for (const w of tTokens) {
      if (sTokens.has(w)) overlap += 1;
    }
    const jaccard = tTokens.size ? overlap / tTokens.size : 0;

    const kwList = keywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    let kwHit = 0;
    for (const k of kwList) {
      if (s.includes(k)) kwHit += 1;
    }
    const kwScore = kwList.length ? kwHit / kwList.length : 0;

    let inclusion = 0;
    if (s.includes(t) || t.includes(s)) inclusion = 0.25;

    return Math.min(100, Math.round((jaccard * 0.55 + kwScore * 0.35 + inclusion) * 100));
  }

  /**
   * Compare one student answer against the teacher answer.
   * Uses MCQ letter matching first, then local semantic scoring.
   */
  async compareAnswer({ question, teacherAnswer, studentAnswer, keywords }) {
    const mcqScore = this.mcqLetterScore(teacherAnswer, studentAnswer);
    if (mcqScore !== null) {
      return {
        score: mcqScore,
        isCorrect: mcqScore >= this.passThreshold,
        reason: mcqScore >= this.passThreshold ? 'Correct option selected' : 'Wrong option selected',
        provider: 'mcq',
      };
    }

    const score = this.localSemanticScore(teacherAnswer, studentAnswer, keywords);
    return {
      score,
      isCorrect: score >= this.passThreshold,
      reason: 'Local semantic keyword match',
      provider: 'local',
    };
  }

  /**
   * Compare all master-key questions against extracted student answers.
   * Returns per-question details and aggregate score summary.
   */
  async compareAll(masterItems, studentItems) {
    const studentMap = {};
    studentItems.forEach((s) => {
      studentMap[s.question_no] = s;
    });

    const details = [];
    for (const master of masterItems) {
      const student = studentMap[master.question_no];
      const studentAnswer = student?.answer || '';
      const comparison = await this.compareAnswer({
        question: master.question,
        teacherAnswer: master.answer,
        studentAnswer,
        keywords: master.keywords,
      });

      details.push({
        question_no: master.question_no,
        question: master.question,
        teacher_answer: master.answer,
        student_answer: studentAnswer || '(not attempted)',
        score: comparison.score,
        is_correct: comparison.isCorrect,
        reason: comparison.reason,
        provider: comparison.provider,
      });
    }

    const correct = details.filter((d) => d.is_correct).length;
    const wrong = details.length - correct;
    const percentage = details.length
      ? Number(((correct / details.length) * 100).toFixed(2))
      : 0;

    return {
      details,
      correct_count: correct,
      wrong_count: wrong,
      total_questions: details.length,
      percentage,
      status: percentage >= 50 ? 'pass' : 'fail',
    };
  }
}

const answerComparisonService = new AnswerComparisonService();

module.exports = {
  AnswerComparisonService,
  answerComparisonService,
  compareAnswer: (...args) => answerComparisonService.compareAnswer(...args),
  compareAll: (...args) => answerComparisonService.compareAll(...args),
  localSemanticScore: (...args) => answerComparisonService.localSemanticScore(...args),
  PASS_THRESHOLD: answerComparisonService.passThreshold,
};

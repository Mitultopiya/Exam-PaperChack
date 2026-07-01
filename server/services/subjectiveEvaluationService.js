const path = require('path');
const MasterKeyModel = require('../models/masterKeyModel');
const SubjectiveModel = require('../models/subjectiveModel');
const { extractFromPdf } = require('./extractService');
const { compareAll } = require('./aiService');
const { markStudentPdf } = require('./pdfMarkingService');
const { ApiError } = require('../utils/helpers');

/**
 * SubjectiveEvaluationService — orchestrates student PDF evaluation.
 * Extracts answers → compares locally → marks original PDF → saves result.
 */
class SubjectiveEvaluationService {
  /**
   * Evaluate a student answer sheet PDF against a master answer key.
   */
  async evaluateStudent({ masterKeyId, studentName, studentPdfPath }) {
    if (!masterKeyId) throw new ApiError(400, 'master_key_id is required');
    if (!studentPdfPath) throw new ApiError(400, 'Student PDF file is required');

    const master = await MasterKeyModel.findById(masterKeyId);
    if (!master) throw new ApiError(404, 'Master answer key not found');

    const masterQuestions = await MasterKeyModel.getQuestions(masterKeyId);
    const masterWithAnswers = masterQuestions.filter((q) => q.answer && String(q.answer).trim());

    const studentExtract = await extractFromPdf(studentPdfPath, { allowMcqWithoutAnswers: true });
    const studentItems = studentExtract.items.filter((q) => q.answer && String(q.answer).trim());

    let evaluation;
    if (masterWithAnswers.length && studentItems.length) {
      evaluation = await compareAll(masterWithAnswers, studentItems);
    } else {
      evaluation = {
        details: [],
        correct_count: 0,
        wrong_count: 0,
        total_questions: 0,
        percentage: 0,
        status: 'fail',
      };
    }

    evaluation.details = evaluation.details || [];
    evaluation.meta = {
      ocr_used: studentExtract.ocr_used,
      ocr_confidence: studentExtract.ocr_confidence,
      pdf_type: studentExtract.pdf_type,
      low_confidence: studentExtract.low_confidence,
      extraction_source: studentExtract.extraction_source,
      partial: !masterWithAnswers.length || !studentItems.length,
    };

    const markedName = `marked_${Date.now()}_${path.basename(studentPdfPath)}`;
    const markedPath = await markStudentPdf({
      studentPdfPath,
      evaluation,
      outputName: markedName,
    });

    const record = await SubjectiveModel.create({
      master_key_id: masterKeyId,
      student_name: studentName,
      student_pdf_path: studentPdfPath,
      marked_pdf_path: markedPath,
      total_questions: evaluation.total_questions,
      correct_count: evaluation.correct_count,
      wrong_count: evaluation.wrong_count,
      percentage: evaluation.percentage,
      status: evaluation.status,
      details_json: evaluation,
    });

    let message = 'Evaluation complete — marked PDF generated';
    if (studentExtract.ocr_used) {
      message = `Scanned PDF processed via OCR (${studentExtract.ocr_confidence}% confidence). Marked PDF ready.`;
    }
    if (studentExtract.low_confidence) {
      message +=
        ' Some answers could not be read clearly — please verify the marked answers before final submission.';
    }

    return {
      message,
      data: {
        ...record,
        details_json: evaluation.details,
        meta: evaluation.meta,
        download_url: `/api/subjective/results/${record.id}/download`,
      },
    };
  }
}

module.exports = new SubjectiveEvaluationService();

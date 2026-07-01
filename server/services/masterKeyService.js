const fs = require('fs');
const MasterKeyModel = require('../models/masterKeyModel');
const { extractFromPdf } = require('./extractService');
const { ApiError } = require('../utils/helpers');

/**
 * MasterKeyService — business logic for uploading and managing master answer keys.
 * Controllers delegate here; this service handles PDF extraction + DB persistence.
 */
class MasterKeyService {
  /**
   * Build a human-readable message describing extraction results.
   */
  buildExtractMessage(extracted, count) {
    const typeLabel = extracted.pdf_type === 'scanned' ? 'Scanned PDF (OCR)' : 'Text PDF';
    let msg = `Detected: ${typeLabel} — extracted ${count} question(s)`;
    if (extracted.ocr_used) {
      msg += ` via OCR (${extracted.ocr_confidence}% confidence)`;
    }
    if (extracted.low_confidence) {
      msg += '. Some answers may need verification.';
    }
    return msg;
  }

  /**
   * Shape extracted data into the API response payload.
   */
  formatMasterResponse(master, questions, extracted) {
    const needsAnswers = extracted.items.some((q) => !q.answer || !String(q.answer).trim());
    return {
      ...master,
      questions,
      format: extracted.format,
      needs_answers: needsAnswers || extracted.items.length === 0,
      pdf_type: extracted.pdf_type,
      ocr_used: extracted.ocr_used,
      ocr_confidence: extracted.ocr_confidence,
      low_confidence: extracted.low_confidence,
      extraction_source: extracted.extraction_source,
    };
  }

  /**
   * Upload a new master answer key PDF, extract Q&A, and persist to DB.
   */
  async uploadMasterKey({ title, filePath }) {
    if (!filePath) throw new ApiError(400, 'PDF file is required');

    const extracted = await extractFromPdf(filePath, { allowMcqWithoutAnswers: true });

    const master = await MasterKeyModel.create({
      title,
      pdf_path: filePath,
      total_questions: extracted.items.length,
    });

    if (extracted.items.length) {
      await MasterKeyModel.saveQuestions(master.id, extracted.items);
    }

    const questions = await MasterKeyModel.getQuestions(master.id);
    const needsAnswers = extracted.items.some((q) => !q.answer || !String(q.answer).trim());

    let message;
    if (extracted.items.length) {
      message = needsAnswers
        ? this.buildExtractMessage(extracted, questions.length) + ' — select correct options below'
        : this.buildExtractMessage(extracted, questions.length);
    } else {
      message =
        this.buildExtractMessage(extracted, 0) +
        '. No question blocks detected yet — you can add answers manually or re-upload.';
    }

    return {
      message,
      data: this.formatMasterResponse(master, questions, extracted),
    };
  }

  /**
   * Re-run PDF extraction on an existing master key (e.g. after OCR improvements).
   */
  async reExtractMasterKey(masterId) {
    const master = await MasterKeyModel.findById(masterId);
    if (!master) throw new ApiError(404, 'Master answer key not found');
    if (!master.pdf_path || !fs.existsSync(master.pdf_path)) {
      throw new ApiError(404, 'Original PDF file not found — please re-upload');
    }

    const extracted = await extractFromPdf(master.pdf_path, { allowMcqWithoutAnswers: true });

    await MasterKeyModel.saveQuestions(master.id, extracted.items);
    await MasterKeyModel.updateTotalQuestions(master.id, extracted.items.length);

    const questions = await MasterKeyModel.getQuestions(master.id);
    const updated = await MasterKeyModel.findById(master.id);

    const message = extracted.items.length
      ? this.buildExtractMessage(extracted, questions.length)
      : this.buildExtractMessage(extracted, 0) +
        '. Try a clearer scan or re-upload a higher-quality PDF.';

    return {
      message,
      data: this.formatMasterResponse(updated, questions, extracted),
    };
  }

  /**
   * Save manually selected MCQ answers for a master key.
   */
  async saveMasterAnswers(masterId, answers) {
    if (!Array.isArray(answers) || !answers.length) {
      throw new ApiError(400, 'answers array is required');
    }

    const master = await MasterKeyModel.findById(masterId);
    if (!master) throw new ApiError(404, 'Master answer key not found');

    const questions = await MasterKeyModel.getQuestions(master.id);
    const qMap = {};
    questions.forEach((q) => (qMap[q.question_no] = q));

    for (const a of answers) {
      const q = qMap[a.question_no];
      if (!q) continue;
      const letter = String(a.correct_answer || a.answer || '').trim().toUpperCase();
      let answerText = letter;
      if (q.options && q.options[letter]) {
        answerText = `${letter}. ${q.options[letter]}`;
      }
      await MasterKeyModel.updateAnswer(master.id, a.question_no, answerText);
    }

    const updated = await MasterKeyModel.getQuestions(master.id);
    return { ...master, questions: updated, needs_answers: false };
  }
}

module.exports = new MasterKeyService();

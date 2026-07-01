const fs = require('fs/promises');
const { getPdfTextContent, runOcr } = require('./ocrService');

/**
 * PdfExtractService — extracts questions and answers from exam PDFs.
 * Supports text PDFs, MCQ layouts, and scanned sheets (via OcrService).
 */

// Answer marker variants: Answer, Ans, Solution, Soln, Correct
const ANSWER_MARKER = '(?:Answer|Ans|Solution|Soln|Correct|Selected)';

// Question header variants: Question 1, Q1, Que 1, 1.
const QUESTION_START =
  '(?:Question|Que|Q)\\s*(\\d+)\\s*[.:)\\]:\\-]*|(?:^|\\n)\\s*(\\d+)\\s*[.)]\\s+';

/**
 * Extract plain text from PDF with proper line breaks (groups text by Y position).
 */
async function readPdfText(filePath) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pageTexts = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const lines = [];
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const [, , , , x, y] = item.transform;
      const topY = viewport.height - y;
      const existing = lines.find((l) => Math.abs(l.y - topY) < 5);
      if (existing) {
        existing.parts.push({ x, text: item.str });
      } else {
        lines.push({ y: topY, parts: [{ x, text: item.str }] });
      }
    }

    lines.sort((a, b) => a.y - b.y);
    for (const line of lines) {
      line.parts.sort((a, b) => a.x - b.x);
      pageTexts.push(line.parts.map((pt) => pt.text).join(' ').trim());
    }
    pageTexts.push('');
  }

  return { text: pageTexts.join('\n'), numPages: doc.numPages };
}

/** Normalize whitespace and line endings in extracted PDF text. */
function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Strip trailing question blocks and excess whitespace from a parsed field. */
function cleanField(value) {
  return String(value || '')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .replace(/\n(?:Question|Q)\s*\d+[\s\S]*$/i, '')
    .trim();
}

/** Pull keywords from answer text for fallback AI matching. */
function extractKeywords(answer) {
  const stop = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'in', 'on', 'for', 'to', 'and', 'or',
    'it', 'that', 'this', 'with', 'as', 'by', 'at', 'from', 'be', 'has', 'have', 'had',
  ]);
  const words = String(answer || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  return [...new Set(words)].slice(0, 12).join(', ');
}

/**
 * Parse answer key section: "1-A", "Q1: A", "1. A", "1) B"
 */
function parseAnswerKeySection(text) {
  const map = {};
  const patterns = [
    /(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d+)\s*[:.\-)\]]\s*([A-Da-d])\b/gi,
    /(?:^|\n)\s*(\d+)\s*[-–]\s*([A-Da-d])\b/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      map[parseInt(m[1], 10)] = m[2].toUpperCase();
    }
  }
  return map;
}

/**
 * Find "Answer Key" / "Answers" section at end of document.
 */
function extractAnswerKeyFromText(fullText) {
  const sections = fullText.split(/\n\s*(?:Answer\s*Key|Answers|Correct\s*Answers|Key\s*Answers)\s*:?\s*\n/i);
  if (sections.length < 2) return {};
  return parseAnswerKeySection(sections[sections.length - 1]);
}

/**
 * Merge answer key letters onto MCQ question list.
 */
function applyAnswerKeyToMcq(items, answerKey) {
  return items.map((q) => {
    const letter = answerKey[q.question_no];
    if (!letter) return q;
    const answerText =
      q.options && q.options[letter] ? `${letter}. ${q.options[letter]}` : letter;
    return { ...q, answer: answerText, selected_letter: letter };
  });
}

/**
 * MCQ format: Q1. question?  A. opt  B. opt  C. opt  D. opt
 */
function extractMcqFromText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const answerKey = extractAnswerKeyFromText(normalized);
  const body = normalized.split(/\n\s*(?:Answer\s*Key|Answers|Correct\s*Answers)\s*:?\s*\n/i)[0];

  const results = [];
  const blockRegex = /(?:^|\n)\s*Q(?:uestion)?\s*(\d+)\s*[.:)\]]\s*([\s\S]*?)(?=(?:\n\s*Q(?:uestion)?\s*\d+\s*[.:)\]])|$)/gi;
  let match;

  while ((match = blockRegex.exec(body)) !== null) {
    const questionNo = parseInt(match[1], 10);
    let block = match[2].trim();

    // Explicit answer line inside block: Answer: A / Ans: B / Correct: C
    const inlineAnswer = block.match(
      new RegExp(`\\n\\s*${ANSWER_MARKER}\\s*:?\\s*([A-Da-d])\\b`, 'i')
    );
    let selectedLetter = inlineAnswer ? inlineAnswer[1].toUpperCase() : answerKey[questionNo] || null;

    // Parse options A. B. C. D.
    const optionRegex = /\n?\s*([A-Da-d])\s*[.)]\s*([^\n]+?)(?=\s*(?:[A-Da-d]\s*[.)]|$|\n\s*[A-Da-d]\s*[.)]))/gi;
    const options = {};
    let om;
    while ((om = optionRegex.exec(block)) !== null) {
      options[om[1].toUpperCase()] = om[2].trim();
    }

    // Remove options from question text.
    let questionText = block
      .replace(new RegExp(`\\n\\s*${ANSWER_MARKER}\\s*:?\\s*[A-Da-d]\\b[\\s\\S]*$`, 'i'), '')
      .replace(/\n?\s*[A-Da-d]\s*[.)]\s*[^\n]+/gi, '')
      .trim();

    if (!questionText && block) {
      questionText = block.split(/\n?\s*[A-Da-d]\s*[.)]/i)[0].trim();
    }

    // Student may only write the answer text without letter.
    const answerLine = block.match(
      new RegExp(`\\n\\s*${ANSWER_MARKER}\\s*:?\\s*\\n?\\s*([^\\n]+)`, 'i')
    );
    if (answerLine && !Object.keys(options).length) {
      results.push({
        question_no: questionNo,
        question: questionText || `Question ${questionNo}`,
        answer: cleanField(answerLine[1]),
        format: 'subjective_inline',
      });
      continue;
    }

    if (!Object.keys(options).length && !selectedLetter) continue;

    const answerText = selectedLetter && options[selectedLetter]
      ? `${selectedLetter}. ${options[selectedLetter]}`
      : selectedLetter || '';

    if (!answerText) {
      // No known correct answer — skip here; use extractMcqQuestionsOnly for master upload.
      continue;
    }

    const optionsText = Object.entries(options)
      .map(([k, v]) => `${k}. ${v}`)
      .join('\n');

    results.push({
      question_no: questionNo,
      question: questionText || `Question ${questionNo}`,
      answer: answerText,
      options,
      options_text: optionsText,
      selected_letter: selectedLetter,
      format: 'mcq',
    });
  }

  return results.sort((a, b) => a.question_no - b.question_no);
}

/**
 * Flexible subjective parser — supports all common exam PDF layouts.
 */
function extractFlexibleSubjective(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const inline = normalized.replace(/\s{2,}/g, '\n');
  const results = [];

  // Pattern A: Question 1 / Q1 / Que 1 + Answer/Ans/Solution
  const blockRegex =
    /(?:^|\n)\s*(?:(?:Question|Que|Q)\s*(\d+)|(\d+))\s*[.:)\]:\\-]*\s*([\s\S]*?)(?=(?:\n\s*(?:(?:Question|Que|Q)\s*\d+|\d+\s*[.)]))|$)/gi;

  let match;
  while ((match = blockRegex.exec(inline)) !== null) {
    const questionNo = parseInt(match[1] || match[2], 10);
    const block = match[3] || '';

    const answerSplit = new RegExp(`\\n?\\s*${ANSWER_MARKER}\\s*:?\\s*\\n?`, 'i');
    const parts = block.split(answerSplit);
    if (parts.length < 2) continue;

    const question = cleanField(parts[0]);
    const answer = cleanField(parts.slice(1).join('\n'));
    if (question && answer && answer.length > 1) {
      results.push({ question_no: questionNo, question, answer, format: 'subjective' });
    }
  }

  return results.sort((a, b) => a.question_no - b.question_no);
}

/**
 * Subjective format (legacy wrapper).
 */
function extractSubjectiveFromText(text) {
  return extractFlexibleSubjective(text);
}

/**
 * Scanned/handwritten answer sheets — numbered blocks + orphan lines before markers.
 */
function extractScannedAnswerSheet(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const markerRes = [];
  const patterns = [
    /(?:^|\n)\s*(\d{1,3})\s*[.)]\)?\s*/g,
    /(?:^|\n)\s*(\d)\s*[-–]\s*(\d{1,2})\s*[.)]\)?\s*/g,
  ];

  for (const markerRe of patterns) {
    let m;
    while ((m = markerRe.exec(normalized)) !== null) {
      const num = m[2] != null ? parseInt(`${m[1]}${m[2]}`, 10) : parseInt(m[1], 10);
      markerRes.push({ index: m.index, end: m.index + m[0].length, num });
    }
  }

  const markers = markerRes
    .sort((a, b) => a.index - b.index)
    .filter((m, i, arr) => i === 0 || m.index >= arr[i - 1].end - 1);

  const results = [];
  const seen = new Set();

  const pushItem = (questionNo, question, answer = '') => {
    const q = cleanField(question);
    const a = cleanField(answer);
    if (!q || q.length < 3) return;
    let no = questionNo;
    while (seen.has(no)) no += 1;
    seen.add(no);
    results.push({
      question_no: no,
      question: q,
      answer: a,
      format: a ? 'subjective' : 'subjective',
    });
  };

  // Lines before the first numbered marker (OCR often drops question numbers).
  if (markers.length) {
    const prefix = normalized.slice(0, markers[0].index).trim();
    const prefixLines = prefix.split('\n').map((l) => l.trim()).filter((l) => l.length >= 10);
    prefixLines.forEach((line, i) => pushItem(i + 1, line));
  }

  // Blocks between numbered markers.
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].end;
    const end = i + 1 < markers.length ? markers[i + 1].index : normalized.length;
    const body = normalized.slice(start, end).trim();
    if (!body) continue;

    const answerSplit = new RegExp(`\\n?\\s*${ANSWER_MARKER}\\s*:?\\s*\\n?`, 'i');
    const ansParts = body.split(answerSplit);
    if (ansParts.length >= 2) {
      pushItem(markers[i].num, ansParts[0], ansParts.slice(1).join('\n'));
      continue;
    }

    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const questionLine = lines[0] || '';
    const restLines = lines.slice(1);

    const options = {};
    const optionRe = /^([A-Da-d])\s*[.)]\)?\s*(.+)$/i;
    for (const line of restLines) {
      const om = line.match(optionRe);
      if (om) options[om[1].toUpperCase()] = om[2].trim();
    }

    if (Object.keys(options).length >= 2) {
      let no = markers[i].num;
      while (seen.has(no)) no += 1;
      seen.add(no);
      results.push({
        question_no: no,
        question: questionLine,
        answer: '',
        options,
        options_text: Object.entries(options)
          .map(([k, v]) => `${k}. ${v}`)
          .join('\n'),
        format: 'mcq',
      });
    } else {
      pushItem(markers[i].num, questionLine, restLines.join('\n'));
    }
  }

  // No numbered markers — group consecutive lines as Q + answer pairs.
  if (!markers.length) {
    const lines = normalized.split('\n').map((l) => l.trim()).filter((l) => l.length >= 8);
    for (let i = 0; i < lines.length; i += 2) {
      const question = lines[i];
      const answer = lines[i + 1] || '';
      pushItem(Math.floor(i / 2) + 1, question, answer);
    }
  }

  return results.sort((a, b) => a.question_no - b.question_no);
}

function extractNumberedQuestions(text) {
  return extractScannedAnswerSheet(text);
}

/**
 * Route extracted text through all supported question parsers.
 * @param {boolean} ocrUsed - Use scanned-sheet parser when OCR was applied.
 */
function parseAllQuestions(text, { allowMcqWithoutAnswers = false, ocrUsed = false } = {}) {
  let items = extractFlexibleSubjective(text);
  if (items.length) return { items, format: 'subjective' };

  if (ocrUsed) {
    items = extractScannedAnswerSheet(text);
    if (items.length) {
      return { items, format: items[0].format || 'subjective' };
    }
  } else {
    items = extractNumberedQuestions(text);
    if (items.length) {
      return { items, format: items[0].format || 'numbered' };
    }
  }

  const mcq = extractMcqFromText(text);
  if (mcq.length) {
    return {
      items: allowMcqWithoutAnswers ? mcq : mcq.filter((q) => q.answer && q.answer.trim()),
      format: 'mcq',
    };
  }

  if (allowMcqWithoutAnswers) {
    items = extractMcqQuestionsOnly(text);
    if (items.length) return { items, format: 'mcq' };
  }

  return { items: [], format: 'unknown' };
}

function extractQuestionsFromText(text) {
  return parseAllQuestions(text).items;
}

/**
 * Main entry point: extract questions from a PDF file path.
 * Auto-detects text vs scanned PDFs and runs OCR when needed.
 */
async function extractFromPdf(filePath, { allowMcqWithoutAnswers = false } = {}) {
  let pdfMeta = await getPdfTextContent(filePath, readPdfText);
  let parsed = parseAllQuestions(pdfMeta.text, {
    allowMcqWithoutAnswers,
    ocrUsed: pdfMeta.ocr_used,
  });
  let items = parsed.items;
  let format = parsed.format;

  // If nothing found and OCR wasn't used yet, force OCR and retry.
  if (!items.length && !pdfMeta.ocr_used) {
    const ocrResult = await runOcr(filePath);
    if (ocrResult.text?.replace(/\s/g, '').length) {
      pdfMeta = {
        ...pdfMeta,
        text: ocrResult.text,
        pdf_type: 'scanned',
        ocr_used: true,
        ocr_confidence: ocrResult.confidence ?? 0,
        extraction_source: ocrResult.source,
        low_confidence: (ocrResult.confidence ?? 0) < 80,
      };
      parsed = parseAllQuestions(ocrResult.text, {
        allowMcqWithoutAnswers,
        ocrUsed: true,
      });
      items = parsed.items;
      format = parsed.format;
    }
  }

  if (items.length && items.every((q) => !q.answer)) {
    const key = extractAnswerKeyFromText(pdfMeta.text);
    if (Object.keys(key).length) {
      items = applyAnswerKeyToMcq(items, key);
    }
  }

  return {
    text: pdfMeta.text,
    numPages: pdfMeta.numPages,
    format,
    pdf_type: pdfMeta.pdf_type,
    ocr_used: pdfMeta.ocr_used,
    ocr_confidence: pdfMeta.ocr_confidence,
    low_confidence: pdfMeta.low_confidence || false,
    extraction_source: pdfMeta.extraction_source,
    items: items.map((item) => ({
      question_no: item.question_no,
      question: item.question,
      answer: item.answer,
      options: item.options || null,
      options_text: item.options_text || null,
      keywords: extractKeywords(item.answer),
      format: item.format,
    })),
  };
}

/**
 * Extract MCQ questions even without answers (for master key UI).
 */
function extractMcqQuestionsOnly(text) {
  const normalized = normalizeText(text);
  const answerKey = extractAnswerKeyFromText(normalized);
  const body = normalized.split(/\n\s*(?:Answer\s*Key|Answers|Correct\s*Answers)\s*:?\s*\n/i)[0];

  const results = [];
  const blockRegex = /(?:^|\n)\s*Q(?:uestion)?\s*(\d+)\s*[.:)\]]\s*([\s\S]*?)(?=(?:\n\s*Q(?:uestion)?\s*\d+\s*[.:)\]])|$)/gi;
  let match;

  while ((match = blockRegex.exec(body)) !== null) {
    const questionNo = parseInt(match[1], 10);
    const block = match[2].trim();
    const optionRegex = /\n?\s*([A-Da-d])\s*[.)]\s*([^\n]+)/gi;
    const options = {};
    let om;
    while ((om = optionRegex.exec(block)) !== null) {
      options[om[1].toUpperCase()] = om[2].trim();
    }

    let questionText = block.replace(/\n?\s*[A-Da-d]\s*[.)]\s*[^\n]+/gi, '').trim();
    if (!questionText) questionText = block.split(/\n?\s*[A-Da-d]\s*[.)]/i)[0].trim();

    const letter = answerKey[questionNo];
    const answer = letter && options[letter]
      ? `${letter}. ${options[letter]}`
      : letter || '';

    results.push({
      question_no: questionNo,
      question: questionText || `Question ${questionNo}`,
      answer,
      options,
      options_text: Object.entries(options).map(([k, v]) => `${k}. ${v}`).join('\n'),
      selected_letter: letter || null,
      format: 'mcq',
    });
  }

  return results.sort((a, b) => a.question_no - b.question_no);
}

module.exports = {
  normalizeText,
  extractQuestionsFromText,
  extractFlexibleSubjective,
  extractScannedAnswerSheet,
  extractNumberedQuestions,
  parseAllQuestions,
  extractSubjectiveFromText,
  extractMcqFromText,
  extractMcqQuestionsOnly,
  applyAnswerKeyToMcq,
  extractKeywords,
  extractFromPdf,
  readPdfText,
  parseAnswerKeySection,
};

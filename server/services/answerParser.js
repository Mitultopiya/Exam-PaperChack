const fs = require('fs');
const path = require('path');
const { normalizeAnswer } = require('../utils/helpers');

/**
 * Parses a student's submitted answer file into a map { question_no: answer }.
 * No OCR is used. Supported formats: JSON, CSV, TXT, and (text-based) PDF.
 */

// A valid selected answer is a single option letter (A-H), a short number,
// or true/false. This prevents question text (e.g. "Q1. What does...") from
// being mistaken for an answer.
const OPTION_TOKEN = '([A-Ha-h]|true|false|\\d{1,2})';

// Parses raw text where each line maps a question number to a selected answer.
// Accepts formats like "1: A", "Q1. B", "1) C", "1 - D", "1,A", or "1 A".
// Lines that only contain question/option text (no clear selected option) are ignored.
function parseTextLines(text) {
  const map = {};
  const lines = text.split(/\r?\n/);

  // number + separator + single option, with the option ending the line.
  const sepRe = new RegExp(`^(?:q(?:uestion)?\\s*)?(\\d+)\\s*[).:=,\\-]+\\s*${OPTION_TOKEN}\\s*$`, 'i');
  // number + space + single option letter (no other text).
  const spaceRe = new RegExp(`^(?:q(?:uestion)?\\s*)?(\\d+)\\s+${OPTION_TOKEN}\\s*$`, 'i');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(sepRe) || line.match(spaceRe);
    if (m) {
      map[parseInt(m[1], 10)] = normalizeAnswer(m[2]);
    }
  }
  return map;
}

// Parses JSON answers in several common shapes.
function parseJson(text) {
  const data = JSON.parse(text);
  const map = {};
  const source = data.answers || data;

  if (Array.isArray(source)) {
    for (const item of source) {
      const qno = item.question_no ?? item.question ?? item.q ?? item.no;
      const ans = item.answer ?? item.correct_answer ?? item.value ?? item.a;
      if (qno !== undefined) map[parseInt(qno, 10)] = normalizeAnswer(ans);
    }
  } else if (source && typeof source === 'object') {
    for (const [key, value] of Object.entries(source)) {
      const qno = parseInt(String(key).replace(/\D/g, ''), 10);
      if (!Number.isNaN(qno)) map[qno] = normalizeAnswer(value);
    }
  }
  return map;
}

// Parses CSV with or without a header row.
function parseCsv(text) {
  const map = {};
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const cols = line.split(',').map((c) => c.trim());
    if (cols.length < 2) continue;
    // Skip a header row like "question_no,answer".
    if (/^\D/.test(cols[0]) && Number.isNaN(parseInt(cols[0], 10))) continue;
    const qno = parseInt(cols[0], 10);
    if (!Number.isNaN(qno)) map[qno] = normalizeAnswer(cols[1]);
  }
  return map;
}

// Reads and parses a file from disk based on its extension.
async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return parseTextLines(data.text);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  if (ext === '.json') return parseJson(content);
  if (ext === '.csv') return parseCsv(content);
  return parseTextLines(content); // .txt and fallback
}

// Normalizes an answers object/array supplied directly in a request body.
function parseAnswersObject(input) {
  if (typeof input === 'string') {
    try {
      return parseJson(input);
    } catch {
      return parseTextLines(input);
    }
  }
  return parseJson(JSON.stringify(input));
}

module.exports = { parseFile, parseAnswersObject, parseTextLines, parseJson, parseCsv };

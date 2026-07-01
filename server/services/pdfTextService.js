const fs = require('fs');
const path = require('path');

// pdfjs-dist legacy build works in Node without a browser canvas.
let pdfjsLib;
async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLib;
}

/**
 * Reads all text items from a PDF with page coordinates.
 * transform: [scaleX, skewY, skewX, scaleY, translateX, translateY]
 */
async function getTextItemsWithPositions(pdfPath) {
  try {
    const pdfjs = await getPdfJs();
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const allItems = [];

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      for (const item of content.items) {
        if (!item.str || !item.str.trim()) continue;
        const [, , , , x, y] = item.transform;
        allItems.push({
          page: p,
          text: item.str,
          x,
          y: viewport.height - y,
          width: item.width || item.str.length * 6,
          height: item.height || 12,
          pageHeight: viewport.height,
          pageWidth: viewport.width,
        });
      }
    }
    return allItems;
  } catch (err) {
    console.warn('PDF position extraction failed, using fallback positions:', err.message);
    return [];
  }
}

/**
 * Finds approximate position of an answer string inside the PDF for marking.
 */
function findAnswerPosition(textItems, answerText, questionNo) {
  if (!answerText || !textItems.length) return null;

  const normalizedAnswer = answerText.toLowerCase().replace(/\s+/g, ' ').trim();
  const answerWords = normalizedAnswer.split(' ').filter(Boolean);
  if (!answerWords.length) return null;

  // Group items by page and line (similar y).
  const byPage = {};
  for (const item of textItems) {
    if (!byPage[item.page]) byPage[item.page] = [];
    byPage[item.page].push(item);
  }

  let best = null;
  let bestScore = 0;

  for (const [pageStr, items] of Object.entries(byPage)) {
    const page = parseInt(pageStr, 10);
    items.sort((a, b) => a.y - b.y || a.x - b.x);

    // Build lines from items with similar y.
    const lines = [];
    for (const item of items) {
      const existing = lines.find((l) => Math.abs(l.y - item.y) < 4);
      if (existing) {
        existing.text += ' ' + item.text;
        existing.items.push(item);
        existing.x = Math.min(existing.x, item.x);
        existing.width = Math.max(existing.x + existing.width, item.x + item.width) - existing.x;
      } else {
        lines.push({
          y: item.y,
          x: item.x,
          width: item.width,
          text: item.text,
          items: [item],
          page,
          pageHeight: item.pageHeight,
          pageWidth: item.pageWidth,
        });
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i].text.toLowerCase();
      // Skip question headers.
      if (/^question\s*\d+/i.test(lines[i].text.trim())) continue;
      if (lineText.trim() === 'answer' || lineText.trim() === 'answer:') continue;

      let score = 0;
      for (const w of answerWords) {
        if (lineText.includes(w)) score += 1;
      }
      score = score / answerWords.length;

      // Boost lines after an "Answer" marker for this question region.
      const prevLines = lines.slice(Math.max(0, i - 3), i).map((l) => l.text.toLowerCase());
      if (prevLines.some((t) => t.includes('answer'))) score += 0.2;
      if (questionNo && prevLines.some((t) => t.includes(`question ${questionNo}`))) score += 0.1;

      if (score > bestScore) {
        bestScore = score;
        const line = lines[i];
        best = {
          page,
          x: line.x,
          y: line.y,
          width: Math.max(line.width, 120),
          height: 16,
          pageHeight: line.pageHeight,
          pageWidth: line.pageWidth,
          score,
        };
      }
    }
  }

  // Require at least partial match.
  if (best && bestScore >= 0.35) return best;

  // Fallback: right side of first page, stacked by question number.
  const first = textItems[0];
  if (first) {
    return {
      page: 1,
      x: first.pageWidth - 80,
      y: 100 + (questionNo || 1) * 40,
      width: 200,
      height: 16,
      pageHeight: first.pageHeight,
      pageWidth: first.pageWidth,
      score: 0,
      fallback: true,
    };
  }
  return null;
}

module.exports = { getTextItemsWithPositions, findAnswerPosition };

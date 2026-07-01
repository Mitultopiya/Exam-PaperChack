const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { getTextItemsWithPositions, findAnswerPosition } = require('./pdfTextService');

const pdfDir = path.join(__dirname, '..', 'pdf');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

/**
 * Marks the ORIGINAL student PDF in-place style:
 * - Green tick on correct answers (right side)
 * - Red circle around wrong answer + red cross beside it
 * - Summary page appended at end
 */
async function markStudentPdf({ studentPdfPath, evaluation, outputName }) {
  const pdfBytes = fs.readFileSync(studentPdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const textItems = await getTextItemsWithPositions(studentPdfPath);
  const pages = pdfDoc.getPages();

  for (const item of evaluation.details) {
    const pos = findAnswerPosition(textItems, item.student_answer, item.question_no);
    if (!pos) continue;

    const pageIndex = Math.min(pos.page - 1, pages.length - 1);
    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();

    // pdf-lib uses bottom-left origin; convert from top-down coords.
    const markY = pageHeight - pos.y;
    const answerX = pos.x;
    const answerWidth = Math.max(pos.width, 150);
    const rightX = Math.min(answerX + answerWidth + 20, page.getWidth() - 30);

    if (item.is_correct) {
      // Green tick drawn with lines (StandardFonts cannot encode ✓).
      const tx = rightX;
      const ty = markY;
      page.drawLine({
        start: { x: tx, y: ty },
        end: { x: tx + 4, y: ty - 5 },
        thickness: 2.5,
        color: rgb(0.13, 0.77, 0.37),
      });
      page.drawLine({
        start: { x: tx + 4, y: ty - 5 },
        end: { x: tx + 14, y: ty + 6 },
        thickness: 2.5,
        color: rgb(0.13, 0.77, 0.37),
      });
    } else {
      // Red circle around the wrong answer text.
      const circleY = markY - 6;
      page.drawEllipse({
        x: answerX + answerWidth / 2,
        y: circleY,
        xScale: answerWidth / 2 + 8,
        yScale: 12,
        borderColor: rgb(0.94, 0.27, 0.27),
        borderWidth: 2,
        color: rgb(1, 1, 1),
        opacity: 0,
      });

      // Red cross beside the answer (drawn with lines).
      const cx = rightX + 6;
      const cy = markY;
      page.drawLine({
        start: { x: cx - 5, y: cy + 5 },
        end: { x: cx + 5, y: cy - 5 },
        thickness: 2.5,
        color: rgb(0.94, 0.27, 0.27),
      });
      page.drawLine({
        start: { x: cx + 5, y: cy + 5 },
        end: { x: cx - 5, y: cy - 5 },
        thickness: 2.5,
        color: rgb(0.94, 0.27, 0.27),
      });
    }
  }

  // Append summary page (teacher-style checked sheet summary).
  const summaryPage = pdfDoc.addPage();
  const { width, height } = summaryPage.getSize();
  const margin = 50;

  summaryPage.drawRectangle({
    x: 0,
    y: height - 90,
    width,
    height: 90,
    color: rgb(0.15, 0.39, 0.92),
  });
  summaryPage.drawText('Evaluation Summary', {
    x: margin,
    y: height - 55,
    size: 22,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  summaryPage.drawText('AI Subjective Answer Sheet Evaluation', {
    x: margin,
    y: height - 78,
    size: 11,
    font,
    color: rgb(0.9, 0.95, 1),
  });

  let y = height - 130;
  const lines = [
    `Total Questions : ${evaluation.total_questions}`,
    `Correct         : ${evaluation.correct_count}`,
    `Wrong           : ${evaluation.wrong_count}`,
    `Percentage      : ${evaluation.percentage}%`,
    '',
    `Status          : ${evaluation.status === 'pass' ? 'PASS' : 'FAIL'}`,
  ];

  for (const line of lines) {
    summaryPage.drawText(line, {
      x: margin,
      y,
      size: 14,
      font: line.startsWith('Status') ? boldFont : font,
      color: line.includes('PASS')
        ? rgb(0.13, 0.77, 0.37)
        : line.includes('FAIL')
          ? rgb(0.94, 0.27, 0.27)
          : rgb(0.12, 0.16, 0.23),
    });
    y -= 28;
  }

  y -= 10;
  summaryPage.drawText('Question-wise Results', {
    x: margin,
    y,
    size: 13,
    font: boldFont,
    color: rgb(0.15, 0.39, 0.92),
  });
  y -= 22;

  for (const d of evaluation.details) {
    let targetPage = summaryPage;
    if (y < 60) {
      targetPage = pdfDoc.addPage();
      y = targetPage.getSize().height - 50;
    }
    const mark = d.is_correct ? 'Correct' : 'Wrong';
    const color = d.is_correct ? rgb(0.13, 0.77, 0.37) : rgb(0.94, 0.27, 0.27);
    targetPage.drawText(`Q${d.question_no}  ${mark}  (${d.score}%)`, {
      x: margin,
      y,
      size: 10,
      font,
      color,
    });
    y -= 16;
  }

  summaryPage.drawText(`Generated on ${new Date().toLocaleString()}`, {
    x: margin,
    y: 30,
    size: 8,
    font,
    color: rgb(0.5, 0.55, 0.6),
  });

  const outBytes = await pdfDoc.save();
  const fileName = outputName || `marked_${Date.now()}.pdf`;
  const outPath = path.join(pdfDir, fileName);
  fs.writeFileSync(outPath, outBytes);
  return outPath;
}

module.exports = { markStudentPdf };

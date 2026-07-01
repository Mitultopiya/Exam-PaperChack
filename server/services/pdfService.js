const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#2563EB',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  gray: '#94A3B8',
  dark: '#1E293B',
  light: '#F1F5F9',
};

const pdfDir = path.join(__dirname, '..', 'pdf');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

/**
 * Generates a professional evaluation PDF report and writes it to /pdf.
 * Returns the absolute file path of the generated PDF.
 */
function generateResultPdf(result) {
  const details = typeof result.details_json === 'string'
    ? JSON.parse(result.details_json || '[]')
    : result.details_json || [];

  const fileName = `result_${result.id}_${Date.now()}.pdf`;
  const filePath = path.join(pdfDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ---- Header / Logo band ----
    doc.rect(0, 0, doc.page.width, 90).fill(COLORS.primary);
    doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
      .text('Smart Answer Evaluation Portal', 40, 28);
    doc.fontSize(11).font('Helvetica')
      .text('Automated Objective Answer Sheet Evaluation Report', 40, 58);

    doc.moveDown(2);
    doc.fillColor(COLORS.dark);

    let y = 110;

    // ---- Student & Exam information ----
    const drawSectionTitle = (title, posY) => {
      doc.fillColor(COLORS.primary).fontSize(13).font('Helvetica-Bold').text(title, 40, posY);
      doc.moveTo(40, posY + 18).lineTo(doc.page.width - 40, posY + 18).strokeColor(COLORS.light).stroke();
      return posY + 28;
    };

    y = drawSectionTitle('Student Information', y);
    doc.fillColor(COLORS.dark).fontSize(10).font('Helvetica');
    const studentInfo = [
      ['Name', result.student_name],
      ['Enrollment No', result.enrollment_no],
      ['Email', result.student_email || '-'],
      ['Course / Batch', `${result.course || '-'} / ${result.batch || '-'}`],
    ];
    studentInfo.forEach((row, i) => {
      const col = i % 2;
      const rowY = y + Math.floor(i / 2) * 18;
      const x = 40 + col * 270;
      doc.font('Helvetica-Bold').text(`${row[0]}: `, x, rowY, { continued: true });
      doc.font('Helvetica').text(String(row[1] ?? '-'));
    });
    y += Math.ceil(studentInfo.length / 2) * 18 + 14;

    y = drawSectionTitle('Exam Information', y);
    doc.fillColor(COLORS.dark).fontSize(10);
    const examInfo = [
      ['Exam', result.exam_title],
      ['Subject', result.subject],
      ['Total Questions', result.total_questions],
      ['Total Marks', result.total_marks],
    ];
    examInfo.forEach((row, i) => {
      const col = i % 2;
      const rowY = y + Math.floor(i / 2) * 18;
      const x = 40 + col * 270;
      doc.font('Helvetica-Bold').text(`${row[0]}: `, x, rowY, { continued: true });
      doc.font('Helvetica').text(String(row[1] ?? '-'));
    });
    y += Math.ceil(examInfo.length / 2) * 18 + 14;

    // ---- Summary cards ----
    y = drawSectionTitle('Evaluation Summary', y);
    const cards = [
      { label: 'Correct', value: result.correct_answers, color: COLORS.success },
      { label: 'Wrong', value: result.wrong_answers, color: COLORS.danger },
      { label: 'Skipped', value: result.skipped_answers, color: COLORS.gray },
      { label: 'Marks', value: `${result.marks}/${result.total_marks}`, color: COLORS.primary },
      { label: 'Percentage', value: `${result.percentage}%`, color: COLORS.warning },
      { label: 'Grade', value: result.grade, color: COLORS.dark },
    ];
    const cardWidth = (doc.page.width - 80 - 5 * 10) / 6;
    cards.forEach((c, i) => {
      const x = 40 + i * (cardWidth + 10);
      doc.roundedRect(x, y, cardWidth, 50, 6).fill(COLORS.light);
      doc.fillColor(c.color).fontSize(14).font('Helvetica-Bold')
        .text(String(c.value), x, y + 10, { width: cardWidth, align: 'center' });
      doc.fillColor(COLORS.dark).fontSize(8).font('Helvetica')
        .text(c.label, x, y + 32, { width: cardWidth, align: 'center' });
    });
    y += 64;

    // Pass/Fail badge
    const passed = result.status === 'pass';
    doc.roundedRect(40, y, 140, 26, 6).fill(passed ? COLORS.success : COLORS.danger);
    doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold')
      .text(passed ? 'RESULT: PASS' : 'RESULT: FAIL', 40, y + 7, { width: 140, align: 'center' });
    y += 44;

    // ---- Question-wise table ----
    y = drawSectionTitle('Question-wise Result', y);

    const tableX = 40;
    const colWidths = [50, 110, 110, 110, 95];
    const headers = ['Q. No', 'Correct', 'Student', 'Result', 'Marks'];

    const drawRow = (cells, rowY, options = {}) => {
      let x = tableX;
      if (options.fill) {
        doc.rect(tableX, rowY - 2, colWidths.reduce((a, b) => a + b, 0), 18).fill(options.fill);
      }
      cells.forEach((cell, i) => {
        doc.fillColor(options.color || COLORS.dark)
          .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .text(String(cell), x + 4, rowY + 2, { width: colWidths[i] - 8, align: 'left' });
        x += colWidths[i];
      });
    };

    drawRow(headers, y, { fill: COLORS.primary, color: '#FFFFFF', bold: true });
    y += 18;

    const resultLabel = { correct: 'Correct', wrong: 'Wrong', skipped: 'Not Attempted' };
    const resultColor = { correct: COLORS.success, wrong: COLORS.danger, skipped: COLORS.gray };
    const resultSymbol = { correct: '[OK]', wrong: '[X]', skipped: '[--]' };

    for (const row of details) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 50;
        drawRow(headers, y, { fill: COLORS.primary, color: '#FFFFFF', bold: true });
        y += 18;
      }
      drawRow(
        [
          row.question_no,
          row.correct_answer,
          row.student_answer,
          `${resultSymbol[row.result]} ${resultLabel[row.result]}`,
          row.marks_awarded,
        ],
        y,
        { fill: row.question_no % 2 === 0 ? '#FFFFFF' : COLORS.light }
      );
      // Color just the result cell text.
      doc.fillColor(resultColor[row.result]).font('Helvetica-Bold').fontSize(9)
        .text(
          `${resultSymbol[row.result]} ${resultLabel[row.result]}`,
          tableX + colWidths[0] + colWidths[1] + colWidths[2] + 4,
          y + 2,
          { width: colWidths[3] - 8 }
        );
      y += 18;
    }

    // ---- Footer ----
    const footerY = doc.page.height - 40;
    doc.fillColor(COLORS.gray).fontSize(8).font('Helvetica')
      .text(
        `Generated on ${new Date().toLocaleString()}  |  Smart Answer Evaluation Portal`,
        40,
        footerY,
        { width: doc.page.width - 80, align: 'center' }
      );

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { generateResultPdf };

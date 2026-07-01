const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'samples');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function writePdf(filename, lines) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const out = path.join(outDir, filename);
    const stream = fs.createWriteStream(out);
    stream.on('finish', () => resolve(out));
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);
    for (const line of lines) {
      doc.text(line);
    }
    doc.end();
  });
}

(async () => {
  await writePdf('Master_Answer_Key.pdf', [
    'Subjective Test - Master Answer Key',
    '',
    'Question 1:',
    'Who is the Prime Minister of India?',
    '',
    'Answer:',
    'Narendra Modi is the Prime Minister of India.',
    '',
    'Question 2:',
    'What is HTML?',
    '',
    'Answer:',
    'HTML stands for Hyper Text Markup Language.',
  ]);

  await writePdf('Student_Answer_Sheet.pdf', [
    'Subjective Test - Student Answer Sheet',
    '',
    'Question 1',
    '',
    'Who is the Prime Minister of India?',
    '',
    'Answer',
    '',
    "Narendra Modi is Prime Minister of India.",
    '',
    'Question 2',
    '',
    'What is HTML?',
    '',
    'Answer',
    '',
    'HTML means Hyper Text Makeup Language.',
  ]);

  console.log('Sample PDFs created in samples/');
})();

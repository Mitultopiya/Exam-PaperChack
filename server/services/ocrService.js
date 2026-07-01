const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const { ApiError } = require('../utils/helpers');

const execFileAsync = promisify(execFile);

/**
 * OcrService — local OCR pipeline for scanned PDFs (no paid APIs).
 * Flow: pdf-parse → pdfjs text → Tesseract.js → optional system CLI fallback.
 */
class OcrService {
  constructor() {
    this.minTextLength = Number(process.env.PDF_MIN_TEXT_LENGTH || 30);
    this.ocrScale = Number(process.env.OCR_RENDER_SCALE || 3);
  }

  /**
   * Detect garbage/hidden-layer text from scanned PDFs (not real exam content).
   */
  isMeaningfulExamText(text) {
    const stripped = String(text || '').replace(/\s/g, '');
    if (stripped.length < 30) return false;

    if (
      /(?:question|answer|\bans\b|solution|\bque\b|^q\s*\d|\d+\s*[.)]\s+[a-zA-Z]{3,})/im.test(text)
    ) {
      return true;
    }

    const words = text.match(/\b[a-zA-Z]{3,}\b/g) || [];
    if (words.length >= 8) return true;

    const lines = text.split('\n').filter((l) => l.trim());
    const shortLines = lines.filter((l) => l.trim().length <= 2).length;
    if (lines.length > 4 && shortLines / lines.length > 0.35) return false;

    const letters = (text.match(/[a-zA-Z]/g) || []).length;
    if (letters / Math.max(stripped.length, 1) < 0.35) return false;

    return words.length >= 5;
  }

  /**
   * Extract embedded text from a PDF using pdf-parse (fast, text-based PDFs).
   */
  async extractWithPdfParse(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return { text: data.text || '', numPages: data.numpages || 0, source: 'pdf-parse' };
    } catch (err) {
      console.warn('pdf-parse failed:', err.message);
      return { text: '', numPages: 0, source: 'pdf-parse' };
    }
  }

  /**
   * Render a single PDF page to a PNG buffer using pdfjs + @napi-rs/canvas.
   */
  async renderPageToPng(page) {
    const { createCanvas } = require('@napi-rs/canvas');
    const viewport = page.getViewport({ scale: this.ocrScale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toBuffer('image/png');
  }

  /**
   * OCR via Tesseract.js on rendered page images (primary local OCR engine).
   */
  async extractWithTesseractJs(filePath) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(await fs.readFile(filePath));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

    let fullText = '';
    let confidenceSum = 0;
    let confidenceCount = 0;

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const png = await this.renderPageToPng(page);
      const result = await Tesseract.recognize(png, 'eng', {
        logger: () => {},
        tessedit_pageseg_mode: '3',
      });
      fullText += `\n${result.data.text || ''}`;
      if (result.data.confidence) {
        confidenceSum += result.data.confidence;
        confidenceCount += 1;
      }
    }

    return {
      text: fullText.trim(),
      numPages: doc.numPages,
      source: 'ocr-tesseract',
      confidence: confidenceCount ? Number((confidenceSum / confidenceCount).toFixed(1)) : 0,
    };
  }

  /**
   * Fallback OCR using system pdftoppm + tesseract CLI (if installed locally).
   */
  async extractWithSystemOcr(filePath) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
    try {
      const prefix = path.join(tmpDir, 'page');
      await execFileAsync('pdftoppm', ['-png', '-r', '200', filePath, prefix]);
      const images = (await fs.readdir(tmpDir)).filter((f) => f.endsWith('.png')).sort();

      let fullText = '';
      for (const img of images) {
        const { stdout } = await execFileAsync('tesseract', [
          path.join(tmpDir, img),
          'stdout',
          '-l',
          'eng',
        ]);
        fullText += `\n${stdout}`;
      }

      return {
        text: fullText.trim(),
        numPages: images.length,
        source: 'ocr-system-cli',
        confidence: 75,
      };
    } catch {
      return null;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Run the full local OCR pipeline: Tesseract.js first, then system CLI.
   */
  async runOcr(filePath) {
    try {
      const result = await this.extractWithTesseractJs(filePath);
      if (result.text.replace(/\s/g, '').length) return result;
    } catch (err) {
      console.warn('Tesseract.js OCR failed:', err.message);
    }

    const systemResult = await this.extractWithSystemOcr(filePath);
    if (systemResult?.text?.replace(/\s/g, '').length) return systemResult;

    return {
      text: '',
      numPages: 0,
      source: 'ocr-failed',
      confidence: 0,
    };
  }

  /**
   * Resolve PDF text: use embedded text when meaningful, otherwise run OCR.
   */
  async getPdfTextContent(filePath, pdfjsReadFn) {
    if (!filePath || !fsSync.existsSync(filePath)) {
      throw new ApiError(400, 'PDF file not found');
    }

    const parsed = await this.extractWithPdfParse(filePath);
    let pdfjsText = '';
    let numPages = parsed.numPages;

    try {
      const js = await pdfjsReadFn(filePath);
      pdfjsText = js.text || '';
      numPages = js.numPages || numPages;
    } catch (err) {
      console.warn('pdfjs text read failed:', err.message);
    }

    const bestText = (pdfjsText.length >= parsed.text.length ? pdfjsText : parsed.text).trim();
    const textLength = bestText.replace(/\s/g, '').length;

    if (textLength >= this.minTextLength && this.isMeaningfulExamText(bestText)) {
      return {
        text: bestText,
        numPages,
        pdf_type: 'text',
        ocr_used: false,
        ocr_confidence: 100,
        extraction_source: pdfjsText.length >= parsed.text.length ? 'pdfjs' : 'pdf-parse',
        low_confidence: false,
      };
    }

    console.log(
      `PDF needs OCR (text length ${textLength}, meaningful=${this.isMeaningfulExamText(bestText)}) — running OCR...`
    );
    const ocrResult = await this.runOcr(filePath);
    const ocrText = (ocrResult.text || bestText).trim();
    const confidence = ocrResult.confidence ?? 0;

    return {
      text: ocrText,
      numPages: ocrResult.numPages || numPages,
      pdf_type: 'scanned',
      ocr_used: true,
      ocr_confidence: confidence,
      extraction_source: ocrResult.source,
      low_confidence: confidence === 0 || confidence < 80,
    };
  }
}

const ocrService = new OcrService();

module.exports = {
  OcrService,
  ocrService,
  MIN_TEXT_LENGTH: ocrService.minTextLength,
  isMeaningfulExamText: (...args) => ocrService.isMeaningfulExamText(...args),
  extractWithPdfParse: (...args) => ocrService.extractWithPdfParse(...args),
  getPdfTextContent: (...args) => ocrService.getPdfTextContent(...args),
  runOcr: (...args) => ocrService.runOcr(...args),
};

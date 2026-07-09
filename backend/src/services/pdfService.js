const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

async function extractWithPdf2Json(pdfBuffer) {
  const tmpFile = path.join(os.tmpdir(), crypto.randomBytes(16).toString('hex') + '.pdf');
  try {
    fs.writeFileSync(tmpFile, pdfBuffer);
    const PDFParser = (await import('pdf2json')).default;
    const parser = new PDFParser();

    return await new Promise((resolve, reject) => {
      parser.on('pdfParser_dataError', (err) => reject(new Error(err.parserError || 'pdf2json error')));
      parser.on('pdfParser_dataReady', (data) => {
        let result = '';
        if (data && data.Pages) {
          for (const page of data.Pages) {
            for (const txt of page.Texts) {
              const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
              result += safeDecode(txt.R.map(r => r.T).join(' ')) + ' ';
            }
          }
        }
        resolve(result.trim());
      });
      parser.loadPDF(tmpFile);
    });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function extractWithPdfParse(pdfBuffer) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(pdfBuffer);
  return data.text.trim();
}

async function processPDF(pdfBuffer) {
  try {
    return await extractWithPdf2Json(pdfBuffer);
  } catch (e1) {
    console.warn('pdf2json failed, trying pdf-parse:', e1.message);
    try {
      return await extractWithPdfParse(pdfBuffer);
    } catch (e2) {
      console.error('Both PDF parsers failed:', e1.message, e2.message);
      throw new Error('Failed to extract text from PDF');
    }
  }
}

module.exports = {
  processPDF
};

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

async function processPDF(pdfBuffer) {
  const tmpFile = path.join(os.tmpdir(), crypto.randomBytes(16).toString('hex') + '.pdf');
  try {
    fs.writeFileSync(tmpFile, pdfBuffer);
    const PDFParser = (await import('pdf2json')).default;
    const parser = new PDFParser();

    const text = await new Promise((resolve, reject) => {
      parser.on('pdfParser_dataError', (err) => reject(new Error(err.parserError || 'PDF parse error')));
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

    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

module.exports = {
  processPDF
}; 
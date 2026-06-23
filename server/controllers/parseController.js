const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parses an uploaded document (PDF, DOCX, DOC, TXT, MD, RTF) and returns the extracted text.
 */
exports.parseDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { mimetype, buffer, originalname } = req.file;
    const ext = originalname.split('.').pop()?.toLowerCase();
    let extractedText = '';

    // ── PDF ──────────────────────────────────────────────────────
    if (mimetype === 'application/pdf' || ext === 'pdf') {
      try {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || '';
        // Clean up excessive blank lines from PDFs
        extractedText = extractedText
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      } catch (pdfErr) {
        console.error('PDF parse error:', pdfErr.message);
        return res.status(422).json({
          success: false,
          message: 'Could not parse PDF. The file may be password-protected or image-based.',
        });
      }
    }

    // ── DOCX ─────────────────────────────────────────────────────
    else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = (result.value || '').trim();
        if (result.messages && result.messages.length > 0) {
          console.warn('Mammoth warnings:', result.messages.map(m => m.message).join('; '));
        }
      } catch (docxErr) {
        console.error('DOCX parse error:', docxErr.message);
        return res.status(422).json({
          success: false,
          message: 'Could not parse DOCX file. It may be corrupted.',
        });
      }
    }

    // ── DOC (legacy Word) ─────────────────────────────────────────
    else if (
      mimetype === 'application/msword' ||
      ext === 'doc'
    ) {
      // mammoth can sometimes handle older .doc files
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = (result.value || '').trim();
      } catch {
        return res.status(422).json({
          success: false,
          message: 'Legacy .doc format could not be parsed. Please save as .docx and try again.',
        });
      }
    }

    // ── RTF ───────────────────────────────────────────────────────
    else if (
      mimetype === 'application/rtf' ||
      mimetype === 'text/rtf' ||
      ext === 'rtf'
    ) {
      // Extract plain text from RTF by stripping control words
      try {
        const rtfContent = buffer.toString('latin1');
        extractedText = stripRtf(rtfContent);
      } catch (rtfErr) {
        return res.status(422).json({
          success: false,
          message: 'Could not parse RTF file.',
        });
      }
    }

    // ── Plain text / Markdown ─────────────────────────────────────
    else if (
      mimetype === 'text/plain' ||
      mimetype === 'text/markdown' ||
      ['txt', 'md', 'markdown', 'text'].includes(ext)
    ) {
      extractedText = buffer.toString('utf8').trim();
    }

    // ── Unsupported ───────────────────────────────────────────────
    else {
      return res.status(400).json({
        success: false,
        message: `Unsupported file type (.${ext}). Supported: PDF, DOCX, TXT, MD, RTF`,
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(422).json({
        success: false,
        message: 'No text could be extracted. The file may be empty or image-based.',
      });
    }

    res.json({
      success: true,
      text: extractedText,
      filename: originalname,
      charCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
    });
  } catch (error) {
    console.error('Document parsing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to parse document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Basic RTF stripper — removes RTF control words and groups
 * For production use, consider the `rtf-parser` npm package
 */
function stripRtf(rtf) {
  // Remove RTF header and control words
  let text = rtf
    .replace(/\{\\[^{}]*\}/g, '')          // Remove control groups like {\colortbl...}
    .replace(/\\[a-z]+(-?\d+)? ?/g, '')    // Remove control words like \par \b \f1
    .replace(/[{}\\]/g, '')                // Remove remaining braces and backslashes
    .replace(/\r\n|\r/g, '\n')             // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')            // Collapse excessive blank lines
    .trim();
  return text || '';
}

const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { parseDocument } = require('../controllers/parseController');

// Allowed MIME types
const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',          // .doc
  'text/plain',                  // .txt
  'text/markdown',               // .md
  'application/rtf',             // .rtf
  'text/rtf',
];

const ALLOWED_EXTS = ['.pdf', '.docx', '.doc', '.txt', '.md', '.markdown', '.rtf'];

// Configure multer to store file in memory with type filtering
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
  fileFilter: (req, file, cb) => {
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (ALLOWED_MIMES.includes(file.mimetype) || ALLOWED_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTS.join(', ')}`), false);
    }
  },
});

// Multer error handler
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File too large. Maximum allowed size is 15 MB.',
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Parse document endpoint
router.post('/', auth, handleUpload, parseDocument);

module.exports = router;

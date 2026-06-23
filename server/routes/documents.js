const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAccess } = require('../middleware/documentAccess');
const {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  shareDocument,
  removeCollaborator,
} = require('../controllers/documentController');

// All routes require authentication
router.use(auth);

// Document CRUD
router.post('/', createDocument);
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.put('/:id', requireAccess('editor'), updateDocument);
router.delete('/:id', requireAccess('admin'), deleteDocument);

// Sharing
router.post('/:id/share', requireAccess('admin'), shareDocument);
router.delete('/:id/share/:userId', requireAccess('admin'), removeCollaborator);

module.exports = router;

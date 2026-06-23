const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { requireAccess } = require('../middleware/documentAccess');
const {
  createVersion,
  getVersions,
  getVersion,
  rollbackToVersion,
} = require('../controllers/versionController');

// All routes require authentication
router.use(auth);

// Version routes (nested under /api/documents/:id/versions)
router.post('/', requireAccess('editor'), createVersion);
router.get('/', requireAccess('viewer'), getVersions);
router.get('/:versionId', requireAccess('viewer'), getVersion);
router.post('/:versionId/rollback', requireAccess('editor'), rollbackToVersion);

module.exports = router;

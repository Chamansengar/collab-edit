const Document = require('../models/Document');

/**
 * Document access middleware factory
 * Checks if the current user has the required role for the document
 *
 * @param {string} requiredRole - 'viewer', 'editor', or 'admin'
 */
const requireAccess = (requiredRole = 'viewer') => {
  return async (req, res, next) => {
    try {
      const documentId = req.params.id || req.params.documentId;

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required.',
        });
      }

      const document = await Document.findOne({
        _id: documentId,
        isDeleted: false,
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found.',
        });
      }

      // Check access using the model method
      if (!document.hasAccess(req.userId, requiredRole)) {
        return res.status(403).json({
          success: false,
          message: `You need '${requiredRole}' access to perform this action.`,
        });
      }

      // Attach document to request for downstream use
      req.document = document;
      next();
    } catch (error) {
      console.error('Document access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking document access.',
      });
    }
  };
};

module.exports = { requireAccess };

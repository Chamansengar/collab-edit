const Document = require('../models/Document');
const User = require('../models/User');

/**
 * Create a new document
 * POST /api/documents
 */
const createDocument = async (req, res) => {
  try {
    const { title } = req.body;

    const document = await Document.create({
      title: title || 'Untitled Document',
      owner: req.userId,
      lastEditedBy: req.userId,
    });

    await document.populate('owner', 'username email avatarColor');

    res.status(201).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating document.',
    });
  }
};

/**
 * Get all documents for the current user (owned + collaborated)
 * GET /api/documents
 */
const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.userId },
        { 'collaborators.user': req.userId },
      ],
      isDeleted: false,
    })
      .populate('owner', 'username email avatarColor')
      .populate('collaborators.user', 'username email avatarColor')
      .populate('lastEditedBy', 'username')
      .select('-yjsState') // Don't send binary state in list
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching documents.',
    });
  }
};

/**
 * Get a single document
 * GET /api/documents/:id
 */
const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate('owner', 'username email avatarColor')
      .populate('collaborators.user', 'username email avatarColor')
      .populate('lastEditedBy', 'username')
      .select('-yjsState');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
      });
    }

    // Check access
    if (!document.hasAccess(req.userId, 'viewer')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this document.',
      });
    }

    // Determine user's role
    let userRole = 'viewer';
    if (document.owner._id.toString() === req.userId.toString()) {
      userRole = 'owner';
    } else {
      const collab = document.collaborators.find(
        (c) => c.user._id.toString() === req.userId.toString()
      );
      if (collab) userRole = collab.role;
    }

    res.json({
      success: true,
      data: {
        document,
        userRole,
      },
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching document.',
    });
  }
};

/**
 * Update document metadata (title, isPublic)
 * PUT /api/documents/:id
 */
const updateDocument = async (req, res) => {
  try {
    const { title, isPublic } = req.body;
    const document = req.document; // Attached by requireAccess middleware

    if (title !== undefined) document.title = title;
    if (isPublic !== undefined) document.isPublic = isPublic;
    document.lastEditedBy = req.userId;

    await document.save();
    await document.populate('owner', 'username email avatarColor');

    res.json({
      success: true,
      data: { document },
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating document.',
    });
  }
};

/**
 * Delete a document (soft delete)
 * DELETE /api/documents/:id
 */
const deleteDocument = async (req, res) => {
  try {
    const document = req.document;

    // Only owner can delete
    if (document.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the document owner can delete it.',
      });
    }

    document.isDeleted = true;
    await document.save();

    res.json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document.',
    });
  }
};

/**
 * Share document with another user
 * POST /api/documents/:id/share
 */
const shareDocument = async (req, res) => {
  try {
    const { email, role } = req.body;
    const document = req.document;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required.',
      });
    }

    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be viewer, editor, or admin.',
      });
    }

    // Find the user to share with
    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User with this email not found.',
      });
    }

    // Can't share with yourself
    if (targetUser._id.toString() === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot share a document with yourself.',
      });
    }

    // Check if already a collaborator
    const existingIndex = document.collaborators.findIndex(
      (c) => c.user.toString() === targetUser._id.toString()
    );

    if (existingIndex >= 0) {
      // Update role
      document.collaborators[existingIndex].role = role;
    } else {
      // Add new collaborator
      document.collaborators.push({
        user: targetUser._id,
        role,
      });
    }

    await document.save();
    await document.populate('collaborators.user', 'username email avatarColor');

    res.json({
      success: true,
      message: `Document shared with ${targetUser.username} as ${role}.`,
      data: { collaborators: document.collaborators },
    });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sharing document.',
    });
  }
};

/**
 * Remove a collaborator
 * DELETE /api/documents/:id/share/:userId
 */
const removeCollaborator = async (req, res) => {
  try {
    const document = req.document;
    const targetUserId = req.params.userId;

    document.collaborators = document.collaborators.filter(
      (c) => c.user.toString() !== targetUserId
    );

    await document.save();

    res.json({
      success: true,
      message: 'Collaborator removed.',
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing collaborator.',
    });
  }
};

module.exports = {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  shareDocument,
  removeCollaborator,
};

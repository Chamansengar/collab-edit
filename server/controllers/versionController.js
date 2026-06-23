const Version = require('../models/Version');
const Document = require('../models/Document');
const Y = require('yjs');

/**
 * Helper: extract plain text from Yjs state buffer
 */
const extractTextFromYjsState = (stateBuffer) => {
  try {
    if (!stateBuffer) return '';
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(stateBuffer));
    const ytext = ydoc.getText('content');
    const text = ytext.toString();
    ydoc.destroy();
    return text;
  } catch {
    return '';
  }
};

/**
 * Create a version snapshot
 * POST /api/documents/:id/versions
 */
const createVersion = async (req, res) => {
  try {
    const document = req.document;
    const { label } = req.body;

    if (!document.yjsState) {
      return res.status(400).json({
        success: false,
        message: 'Document has no content to snapshot.',
      });
    }

    const textContent = extractTextFromYjsState(document.yjsState);

    const version = await Version.create({
      document: document._id,
      snapshot: document.yjsState,
      textContent,
      createdBy: req.userId,
      label,
    });

    await version.populate('createdBy', 'username email avatarColor');

    res.status(201).json({
      success: true,
      data: {
        version: {
          _id: version._id,
          version: version.version,
          label: version.label,
          textContent: version.textContent,
          createdBy: version.createdBy,
          createdAt: version.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating version.',
    });
  }
};

/**
 * Get all versions of a document
 * GET /api/documents/:id/versions
 */
const getVersions = async (req, res) => {
  try {
    const versions = await Version.find({ document: req.params.id })
      .populate('createdBy', 'username email avatarColor')
      .select('-snapshot') // Don't send binary data in list
      .sort({ version: -1 });

    res.json({
      success: true,
      data: { versions },
    });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching versions.',
    });
  }
};

/**
 * Get a specific version with text content
 * GET /api/documents/:id/versions/:versionId
 */
const getVersion = async (req, res) => {
  try {
    const version = await Version.findOne({
      _id: req.params.versionId,
      document: req.params.id,
    })
      .populate('createdBy', 'username email avatarColor')
      .select('-snapshot');

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found.',
      });
    }

    res.json({
      success: true,
      data: { version },
    });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching version.',
    });
  }
};

const { docs } = require('../services/yjsService');

/**
 * Rollback document to a previous version
 * POST /api/documents/:id/versions/:versionId/rollback
 */
const rollbackToVersion = async (req, res) => {
  try {
    const version = await Version.findOne({
      _id: req.params.versionId,
      document: req.params.id,
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found.',
      });
    }

    const document = req.document;

    // Create a snapshot of current state before rollback
    if (document.yjsState) {
      const currentText = extractTextFromYjsState(document.yjsState);
      await Version.create({
        document: document._id,
        snapshot: document.yjsState,
        textContent: currentText,
        createdBy: req.userId,
        label: `Auto-save before rollback to v${version.version}`,
      });
    }

    // Restore the old version's state
    document.yjsState = version.snapshot;
    document.lastEditedBy = req.userId;
    await document.save();

    // Drop active connections so clients reconnect and fetch the rolled-back state
    const docIdStr = document._id.toString();
    if (docs.has(docIdStr)) {
      const docEntry = docs.get(docIdStr);
      const { ydoc, conns, awareness, saveTimeout } = docEntry;
      
      if (saveTimeout) clearTimeout(saveTimeout);
      
      conns.forEach((_, socket) => {
        socket.emit('error', { message: 'Document rolled back. Reconnecting...' });
        socket.disconnect(true);
      });
      
      awareness.destroy();
      ydoc.destroy();
      docs.delete(docIdStr);
    }

    res.json({
      success: true,
      message: `Rolled back to version ${version.version}.`,
      data: {
        textContent: version.textContent,
      },
    });
  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rolling back to version.',
    });
  }
};

module.exports = {
  createVersion,
  getVersions,
  getVersion,
  rollbackToVersion,
};

const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      default: 'Untitled Document',
      maxlength: [200, 'Title must be at most 200 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Yjs document state stored as binary
    yjsState: {
      type: Buffer,
      default: null,
    },
    collaborators: [collaboratorSchema],
    isPublic: {
      type: Boolean,
      default: false,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
documentSchema.index({ 'collaborators.user': 1 });
documentSchema.index({ owner: 1, isDeleted: 1 });

// Virtual to get plain text content from Yjs state (for search, etc.)
documentSchema.methods.hasAccess = function (userId, requiredRole = 'viewer') {
  const roleHierarchy = { viewer: 0, editor: 1, admin: 2 };
  const uid = userId.toString();

  // Owner has full access — handle both populated and unpopulated owner
  const ownerId = this.owner?._id ? this.owner._id.toString() : this.owner.toString();
  if (ownerId === uid) return true;

  // Public documents allow viewer access
  if (this.isPublic && requiredRole === 'viewer') return true;

  // Check collaborators — handle both populated and unpopulated user refs
  const collab = this.collaborators.find((c) => {
    const collabUserId = c.user?._id ? c.user._id.toString() : c.user.toString();
    return collabUserId === uid;
  });

  if (!collab) return false;

  return roleHierarchy[collab.role] >= roleHierarchy[requiredRole];
};

module.exports = mongoose.model('Document', documentSchema);

const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    // Full Yjs state snapshot
    snapshot: {
      type: Buffer,
      required: true,
    },
    // Plain text content for display/diffing without decoding Yjs state
    textContent: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: [100, 'Label must be at most 100 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient version lookups
versionSchema.index({ document: 1, version: -1 });

// Auto-increment version number per document
versionSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastVersion = await this.constructor
      .findOne({ document: this.document })
      .sort({ version: -1 })
      .select('version')
      .lean();

    this.version = lastVersion ? lastVersion.version + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('Version', versionSchema);

import { useState, useEffect } from 'react';
import { X, RotateCcw, Tag, Clock, User } from 'lucide-react';
import { versionService } from '../../services/authService';
import toast from 'react-hot-toast';
import { diffLines } from 'diff';

const VersionPanel = ({ documentId, currentText, isOpen, onClose, onRollback }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchVersions();
    }
  }, [isOpen, documentId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const { data } = await versionService.getAll(documentId);
      setVersions(data.data.versions);
    } catch (err) {
      toast.error('Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 280);
  };

  const handleRollback = async (versionId) => {
    if (!window.confirm('Are you sure? Current state will be auto-saved before rolling back.')) {
      return;
    }

    try {
      await versionService.rollback(documentId, versionId);
      toast.success('Rolled back successfully! Refresh the page to see changes.');
      onRollback?.();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rollback failed');
    }
  };

  const renderDiff = (versionText) => {
    if (!versionText || !currentText) return null;

    const changes = diffLines(versionText, currentText);

    return (
      <div className="diff-view">
        {changes.map((part, i) => (
          <div
            key={i}
            className={`diff-line ${
              part.added ? 'diff-added' : part.removed ? 'diff-removed' : 'diff-context'
            }`}
          >
            {part.value}
          </div>
        ))}
      </div>
    );
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" style={{ background: 'transparent' }} onClick={handleClose}></div>
      <div className={`version-panel ${closing ? 'closing' : ''}`}>
        <div className="version-panel-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
            Version History
          </h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div className="version-panel-content">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ padding: 'var(--space-3)' }}>
                  <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 8 }}></div>
                  <div className="skeleton" style={{ width: '40%', height: 12 }}></div>
                </div>
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state-icon" style={{ width: 60, height: 60 }}>
                <Clock size={28} />
              </div>
              <h3 style={{ fontSize: 'var(--text-base)' }}>No versions yet</h3>
              <p>Save a version to start tracking changes.</p>
            </div>
          ) : (
            <>
              {versions.map((version, index) => (
                <div key={version._id}>
                  <div
                    className={`version-item ${
                      selectedVersion?._id === version._id ? 'selected' : ''
                    }`}
                    onClick={() =>
                      setSelectedVersion(
                        selectedVersion?._id === version._id ? null : version
                      )
                    }
                  >
                    <div className="version-timeline">
                      <div className="version-dot"></div>
                      {index < versions.length - 1 && <div className="version-line"></div>}
                    </div>
                    <div className="version-info">
                      <div className="version-label">
                        {version.label || `Version ${version.version}`}
                      </div>
                      <div className="version-meta">
                        <User size={11} />
                        <span>{version.createdBy?.username || 'Unknown'}</span>
                        <span>•</span>
                        <span>{timeAgo(version.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRollback(version._id);
                      }}
                      data-tooltip="Restore"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>

                  {selectedVersion?._id === version._id && (
                    <div className="animate-slide-down" style={{ padding: 'var(--space-2) var(--space-4)', marginBottom: 'var(--space-3)' }}>
                      <p style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-tertiary)',
                        marginBottom: 'var(--space-2)',
                      }}>
                        Changes from this version to current:
                      </p>
                      {renderDiff(version.textContent)}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default VersionPanel;

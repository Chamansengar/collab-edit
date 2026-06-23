import { useState } from 'react';
import { X, UserPlus, Link2, Trash2, Copy, Check } from 'lucide-react';
import { documentService } from '../../services/authService';
import toast from 'react-hot-toast';

const ShareModal = ({ isOpen, onClose, document, onUpdate }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !document) return null;

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { data } = await documentService.share(document._id, {
        email: email.trim(),
        role,
      });
      toast.success(data.message);
      setEmail('');
      onUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    try {
      await documentService.removeCollaborator(document._id, userId);
      toast.success('Collaborator removed');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed to remove collaborator');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <UserPlus size={20} style={{ color: 'var(--accent-primary)' }} />
            Share Document
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Share form */}
        <form onSubmit={handleShare} className="flex gap-2" style={{ marginBottom: 'var(--space-6)' }}>
          <input
            type="email"
            className="input"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <div className="spinner" style={{ width: 14, height: 14, borderTopColor: 'white' }}></div>
            ) : (
              'Invite'
            )}
          </button>
        </form>

        {/* Copy link */}
        <button
          className="btn btn-secondary w-full"
          onClick={handleCopyLink}
          style={{ marginBottom: 'var(--space-6)' }}
        >
          {copied ? <Check size={16} /> : <Link2 size={16} />}
          {copied ? 'Copied!' : 'Copy Document Link'}
        </button>

        {/* Collaborators list */}
        {document.collaborators && document.collaborators.length > 0 && (
          <>
            <hr className="divider" />
            <h4 style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)',
              marginBottom: 'var(--space-3)',
              color: 'var(--text-secondary)',
            }}>
              Collaborators ({document.collaborators.length})
            </h4>
            <div className="flex flex-col gap-1">
              {document.collaborators.map((collab) => (
                <div key={collab.user?._id || collab.user} className="share-collaborator-item">
                  <div
                    className="avatar avatar-sm"
                    style={{
                      background: collab.user?.avatarColor || 'var(--accent-primary)',
                    }}
                  >
                    {collab.user?.username?.charAt(0) || '?'}
                  </div>
                  <div className="share-collaborator-info">
                    <div className="share-collaborator-name">
                      {collab.user?.username || 'Unknown'}
                    </div>
                    <div className="share-collaborator-email">
                      {collab.user?.email || ''}
                    </div>
                  </div>
                  <span className="badge badge-primary">{collab.role}</span>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => handleRemove(collab.user?._id || collab.user)}
                    data-tooltip="Remove"
                  >
                    <Trash2 size={14} style={{ color: 'var(--error)' }} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShareModal;

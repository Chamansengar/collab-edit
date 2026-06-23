import { useNavigate } from 'react-router-dom';
import { Clock, Users, MoreVertical, Trash2, FileText } from 'lucide-react';
import { useState } from 'react';

const DocumentCard = ({ document, onDelete, currentUserId }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = document.owner?._id === currentUserId;
  const collabCount = (document.collaborators?.length || 0) + 1;

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleClick = () => {
    navigate(`/documents/${document._id}`);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (window.confirm('Are you sure you want to delete this document?')) {
      onDelete(document._id);
    }
  };

  return (
    <div className="doc-card card card-interactive" onClick={handleClick}>
      <div className="doc-card-header">
        <div className="doc-card-icon">
          <FileText size={22} />
        </div>
        {isOwner && (
          <div className="doc-card-menu relative">
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="doc-card-dropdown animate-slide-down">
                <button className="dropdown-item danger" onClick={handleDelete}>
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <h3 className="doc-card-title truncate">{document.title}</h3>

      <div className="doc-card-footer">
        <div className="doc-card-meta">
          <Clock size={13} />
          <span>{timeAgo(document.updatedAt)}</span>
        </div>
        <div className="doc-card-meta">
          <Users size={13} />
          <span>{collabCount}</span>
        </div>
        {!isOwner && (
          <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>Shared</span>
        )}
      </div>

      <style>{`
        .doc-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          position: relative;
          overflow: visible;
        }

        .doc-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: var(--radius-xl);
          padding: 1px;
          background: var(--accent-gradient);
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity var(--transition-base);
          pointer-events: none;
        }

        .doc-card:hover::before {
          opacity: 1;
        }

        .doc-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .doc-card-icon {
          width: 44px;
          height: 44px;
          background: var(--accent-gradient-subtle);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
        }

        .doc-card-title {
          font-size: var(--text-base);
          font-weight: var(--font-semibold);
        }

        .doc-card-footer {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-top: auto;
        }

        .doc-card-meta {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }

        .doc-card-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: var(--bg-elevated);
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-lg);
          padding: var(--space-1);
          min-width: 140px;
          box-shadow: var(--shadow-lg);
          z-index: var(--z-dropdown);
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          width: 100%;
          padding: var(--space-2) var(--space-3);
          font-size: var(--text-sm);
          color: var(--text-secondary);
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-family: var(--font-sans);
          transition: all var(--transition-fast);
        }

        .dropdown-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .dropdown-item.danger {
          color: var(--error);
        }

        .dropdown-item.danger:hover {
          background: var(--error-bg);
        }
      `}</style>
    </div>
  );
};

export default DocumentCard;

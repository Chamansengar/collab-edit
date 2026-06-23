import {
  ArrowLeft,
  Eye,
  Columns2,
  FileCode2,
  Save,
  Share2,
  History,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Toolbar = ({
  title,
  onTitleChange,
  viewMode,
  onViewModeChange,
  onSaveVersion,
  onShare,
  onVersionHistory,
  onImport,
  connected,
  collaborators = [],
  saving,
}) => {
  const navigate = useNavigate();

  return (
    <div className="editor-toolbar">
      {/* Left: Back + Title */}
      <div className="toolbar-left">
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => navigate('/dashboard')}
          data-tooltip="Back to Dashboard"
        >
          <ArrowLeft size={20} />
        </button>

        <input
          type="text"
          className="toolbar-doc-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled Document"
        />

        <div className="save-status">
          <div className={`dot ${connected ? 'saved' : 'error'}`}></div>
          <span>{connected ? (saving ? 'Saving...' : 'Connected') : 'Offline'}</span>
        </div>
      </div>

      {/* Center: View Mode Toggle */}
      <div className="toolbar-center">
        <button
          className={`view-toggle-btn ${viewMode === 'edit' ? 'active' : ''}`}
          onClick={() => onViewModeChange('edit')}
          data-tooltip="Editor Only"
        >
          <FileCode2 size={14} style={{ marginRight: 4 }} />
          Edit
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'split' ? 'active' : ''}`}
          onClick={() => onViewModeChange('split')}
          data-tooltip="Split View"
        >
          <Columns2 size={14} style={{ marginRight: 4 }} />
          Split
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'preview' ? 'active' : ''}`}
          onClick={() => onViewModeChange('preview')}
          data-tooltip="Preview Only"
        >
          <Eye size={14} style={{ marginRight: 4 }} />
          Preview
        </button>
      </div>

      {/* Right: Actions + Collaborators */}
      <div className="toolbar-right">
        {/* Online collaborators */}
        {collaborators.length > 0 && (
          <div className="collaborators-bar">
            <div className="avatar-stack">
              {collaborators.slice(0, 5).map((collab, i) => (
                <div
                  key={collab.clientId || i}
                  className="avatar avatar-sm collaborator-avatar"
                  style={{ background: collab.color || 'var(--accent-primary)' }}
                  data-tooltip={collab.name}
                >
                  {collab.name?.charAt(0)}
                  <div className="online-dot"></div>
                </div>
              ))}
            </div>
            {collaborators.length > 5 && (
              <span style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                marginLeft: 4
              }}>
                +{collaborators.length - 5}
              </span>
            )}
          </div>
        )}

        <div className="toolbar-divider"></div>

        {/* Import Document button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={onImport}
          data-tooltip="Import Document (PDF, DOCX, TXT, MD)"
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-secondary)' }}
        >
          <Upload size={15} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>Import</span>
        </button>

        <button
          className="btn btn-ghost btn-sm"
          onClick={onSaveVersion}
          data-tooltip="Save Version"
        >
          <Save size={16} />
        </button>

        <button
          className="btn btn-ghost btn-sm"
          onClick={onVersionHistory}
          data-tooltip="Version History"
        >
          <History size={16} />
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onShare}
        >
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

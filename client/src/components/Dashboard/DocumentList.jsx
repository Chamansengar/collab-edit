import { useState, useEffect } from 'react';
import { Plus, Search, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { documentService } from '../../services/authService';
import DocumentCard from './DocumentCard';
import CreateDocumentModal from './CreateDocumentModal';
import toast from 'react-hot-toast';

const DocumentList = () => {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data } = await documentService.getAll();
      setDocuments(data.data.documents);
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await documentService.delete(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      toast.success('Document deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleCreated = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <div className="dashboard-logo">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <defs>
                <linearGradient id="dLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6C5CE7"/>
                  <stop offset="100%" stopColor="#00B4D8"/>
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="8" fill="url(#dLogo)"/>
              <path d="M8 10h10M8 16h16M8 22h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="24" cy="10" r="3" fill="#00F5D4" opacity="0.9"/>
            </svg>
            <span className="logo-text">CollabEdit</span>
          </div>
        </div>
        <div className="dashboard-header-right">
          <div className="user-info">
            <div
              className="avatar avatar-md"
              style={{ background: user?.avatarColor || 'var(--accent-primary)' }}
            >
              {user?.username?.charAt(0)}
            </div>
            <span className="user-name">{user?.username}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout} data-tooltip="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-title-row">
          <div>
            <h1>Your Documents</h1>
            <p className="dashboard-subtitle">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            New Document
          </button>
        </div>

        {/* Search Bar */}
        <div className="dashboard-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>

        {/* Document Grid */}
        {loading ? (
          <div className="doc-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card" style={{ padding: 'var(--space-6)' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-3)' }}></div>
                <div className="skeleton" style={{ width: '70%', height: 20, marginBottom: 'var(--space-2)' }}></div>
                <div className="skeleton" style={{ width: '40%', height: 14 }}></div>
              </div>
            ))}
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="doc-grid stagger-children">
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc._id}
                document={doc}
                onDelete={handleDelete}
                currentUserId={user?._id}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state animate-fade-in">
            <div className="empty-state-icon">
              <FileText size={36} />
            </div>
            <h3>{search ? 'No matching documents' : 'No documents yet'}</h3>
            <p>
              {search
                ? 'Try a different search term'
                : 'Create your first document and start collaborating in real-time.'}
            </p>
            {!search && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 'var(--space-6)' }}
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={18} />
                Create Document
              </button>
            )}
          </div>
        )}
      </main>

      <CreateDocumentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />

      <style>{`
        .dashboard {
          min-height: 100vh;
          background: var(--bg-primary);
        }

        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-8);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--surface-glass-border);
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
          backdrop-filter: blur(12px);
        }

        .dashboard-header-left {
          display: flex;
          align-items: center;
        }

        .dashboard-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .logo-text {
          font-size: var(--text-xl);
          font-weight: var(--font-bold);
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .dashboard-header-right {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .user-name {
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          color: var(--text-secondary);
        }

        .dashboard-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-8);
        }

        .dashboard-title-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: var(--space-6);
        }

        .dashboard-title-row h1 {
          font-size: var(--text-3xl);
          margin-bottom: var(--space-1);
        }

        .dashboard-subtitle {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
        }

        .dashboard-search {
          position: relative;
          margin-bottom: var(--space-6);
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .doc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
        }

        @media (max-width: 768px) {
          .dashboard-header {
            padding: var(--space-3) var(--space-4);
          }

          .dashboard-main {
            padding: var(--space-4);
          }

          .dashboard-title-row {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-4);
          }

          .user-name {
            display: none;
          }

          .doc-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DocumentList;

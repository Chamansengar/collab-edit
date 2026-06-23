import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentService, versionService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import useCollaboration from '../hooks/useCollaboration';
import CollaborativeEditor from '../components/Editor/CollaborativeEditor';
import MarkdownPreview from '../components/Editor/MarkdownPreview';
import Toolbar from '../components/Editor/Toolbar';
import VersionPanel from '../components/VersionHistory/VersionPanel';
import ShareModal from '../components/Sharing/ShareModal';
import DocumentImportModal from '../components/Editor/DocumentImportModal';
import toast from 'react-hot-toast';
import '../styles/editor.css';

const EditorPage = () => {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [document, setDocument] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('split');
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Ref to the editor view — passed down so the import modal can use cursor position
  const editorViewRef = useRef(null);

  // Initialize collaboration
  const { ydoc, provider, awareness, connected, synced, collaborators } =
    useCollaboration(documentId);

  // Get ytext for preview and import
  const ytext = useMemo(() => {
    if (!ydoc) return null;
    return ydoc.getText('content');
  }, [ydoc]);

  // Fetch document metadata
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const { data } = await documentService.getById(documentId);
        setDocument(data.data.document);
        setTitle(data.data.document.title);
      } catch (err) {
        toast.error('Failed to load document');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [documentId, navigate]);

  // Auto-save title changes (debounced)
  useEffect(() => {
    if (!document || title === document.title) return;

    const timeout = setTimeout(async () => {
      try {
        await documentService.update(documentId, { title });
      } catch {
        // Silent fail for title update
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [title, document, documentId]);

  const handleSaveVersion = useCallback(async () => {
    setSaving(true);
    try {
      await versionService.create(documentId, {
        label: `Manual save`,
      });
      toast.success('Version saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save version');
    } finally {
      setSaving(false);
    }
  }, [documentId]);

  const handleRefreshDoc = useCallback(async () => {
    try {
      const { data } = await documentService.getById(documentId);
      setDocument(data.data.document);
    } catch {
      // Silent fail
    }
  }, [documentId]);

  const getCurrentText = useCallback(() => {
    if (!ytext) return '';
    return ytext.toString();
  }, [ytext]);

  if (loading) {
    return (
      <div className="editor-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-lg"></div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            Loading document...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <Toolbar
        title={title}
        onTitleChange={setTitle}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSaveVersion={handleSaveVersion}
        onShare={() => setShowShareModal(true)}
        onVersionHistory={() => setShowVersionPanel(true)}
        onImport={() => setShowImportModal(true)}
        connected={connected}
        collaborators={collaborators}
        saving={saving}
      />

      <div className="editor-container">
        {/* Editor Pane */}
        {viewMode !== 'preview' && (
          <div className={`editor-pane ${viewMode === 'split' ? 'split' : ''}`}>
            {ydoc && provider && awareness ? (
              <CollaborativeEditor
                ydoc={ydoc}
                provider={provider}
                awareness={awareness}
                editorViewRef={editorViewRef}
              />
            ) : (
              <div className="flex items-center justify-center" style={{ height: '100%' }}>
                <div className="spinner spinner-lg"></div>
              </div>
            )}
          </div>
        )}

        {/* Preview Pane */}
        {viewMode !== 'edit' && (
          <div className="preview-pane">
            <MarkdownPreview ytext={ytext} />
          </div>
        )}
      </div>

      {/* Version History Panel */}
      <VersionPanel
        documentId={documentId}
        currentText={getCurrentText()}
        isOpen={showVersionPanel}
        onClose={() => setShowVersionPanel(false)}
        onRollback={handleRefreshDoc}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        document={document}
        onUpdate={handleRefreshDoc}
      />

      {/* Document Import Modal */}
      <DocumentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        ytext={ytext}
        viewRef={editorViewRef}
      />
    </div>
  );
};

export default EditorPage;

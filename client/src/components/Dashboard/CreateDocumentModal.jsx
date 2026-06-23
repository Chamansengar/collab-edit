import { useState } from 'react';
import { X, FileText, Sparkles } from 'lucide-react';
import { documentService } from '../../services/authService';
import toast from 'react-hot-toast';

const CreateDocumentModal = ({ isOpen, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await documentService.create({
        title: title.trim() || 'Untitled Document',
      });
      toast.success('Document created!');
      onCreated(data.data.document);
      setTitle('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
            New Document
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
            <label className="input-label" htmlFor="doc-title">Document Title</label>
            <div className="input-wrapper">
              <FileText size={18} className="input-icon" />
              <input
                id="doc-title"
                type="text"
                className="input"
                style={{ paddingLeft: '40px' }}
                placeholder="My Awesome Document"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <div className="spinner" style={{ borderTopColor: 'white', width: 16, height: 16 }}></div>
              ) : (
                'Create Document'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDocumentModal;

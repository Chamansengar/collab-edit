import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, File, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SUPPORTED_TYPES = [
  { ext: '.pdf',  mime: 'application/pdf', label: 'PDF Document', color: '#e74c3c' },
  { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word Document', color: '#2980b9' },
  { ext: '.doc',  mime: 'application/msword', label: 'Word 97-2003', color: '#2980b9' },
  { ext: '.txt',  mime: 'text/plain', label: 'Plain Text', color: '#27ae60' },
  { ext: '.md',   mime: 'text/markdown', label: 'Markdown', color: '#8e44ad' },
  { ext: '.rtf',  mime: 'application/rtf', label: 'Rich Text', color: '#e67e22' },
];

const INSERT_MODES = [
  { id: 'append',  label: 'Append to end',       desc: 'Add content after existing text' },
  { id: 'replace', label: 'Replace all content',  desc: 'Overwrite the entire document' },
  { id: 'cursor',  label: 'Insert at cursor',     desc: 'Insert at current cursor position' },
];

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const type = SUPPORTED_TYPES.find(t => t.ext === `.${ext}`);
  return type ? { color: type.color, label: type.label } : { color: '#64748b', label: 'Unknown' };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DocumentImportModal = ({ isOpen, onClose, ytext, viewRef }) => {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [insertMode, setInsertMode] = useState('append');
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setErrorMsg('');
    setShowModeMenu(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateFile = (f) => {
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (f.size > maxSize) {
      return `File too large. Max allowed: 15 MB (your file: ${formatBytes(f.size)})`;
    }
    const validExts = SUPPORTED_TYPES.map(t => t.ext);
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    const validMimes = SUPPORTED_TYPES.map(t => t.mime);
    if (!validExts.includes(ext) && !validMimes.includes(f.type)) {
      return `Unsupported file type. Supported: ${validExts.join(', ')}`;
    }
    return null;
  };

  const pickFile = (f) => {
    const err = validateFile(f);
    if (err) {
      setErrorMsg(err);
      setStatus('error');
      setFile(null);
      return;
    }
    setFile(f);
    setStatus('idle');
    setErrorMsg('');
  };

  const handleFileInput = (e) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
    e.target.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) pickFile(f);
  }, []);

  const handleDragEnter = (e) => { e.preventDefault(); dragCounter.current++; setDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setDragging(false); } };
  const handleDragOver = (e) => { e.preventDefault(); };

  const handleImport = async () => {
    if (!file || !ytext) return;
    setStatus('uploading');
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Animate progress during upload
      const progressTimer = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 80));
      }, 300);

      const response = await api.post('/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(progressTimer);
      setProgress(90);

      const parsedText = response.data.text;
      if (!parsedText || parsedText.trim().length === 0) {
        setStatus('error');
        setErrorMsg('No text could be extracted from this file. It may be image-based or empty.');
        return;
      }

      // Insert into Yjs document based on chosen mode
      if (insertMode === 'replace') {
        // Delete all existing content and insert new
        const currentLength = ytext.length;
        if (currentLength > 0) ytext.delete(0, currentLength);
        ytext.insert(0, parsedText);
      } else if (insertMode === 'cursor' && viewRef?.current) {
        const view = viewRef.current;
        const pos = view.state.selection.main.head ?? ytext.length;
        const prefix = pos > 0 && ytext.toString()[pos - 1] !== '\n' ? '\n\n' : '';
        ytext.insert(pos, prefix + parsedText);
      } else {
        // append mode
        const currentText = ytext.toString();
        const prefix = currentText.length > 0 ? '\n\n' : '';
        ytext.insert(ytext.length, prefix + parsedText);
      }

      setProgress(100);
      setStatus('success');
      toast.success(`"${file.name}" imported successfully!`);

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      console.error('Import error:', err);
      setStatus('error');
      setErrorMsg(err.response?.data?.message || 'Failed to parse the document. Please try again.');
    }
  };

  if (!isOpen) return null;

  const fileInfo = file ? getFileIcon(file.name) : null;
  const selectedMode = INSERT_MODES.find(m => m.id === insertMode);

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      style={{ zIndex: 1000 }}
    >
      <div
        className="modal animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{
          width: '520px',
          maxWidth: '95vw',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-2xl)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-5) var(--space-6)',
          borderBottom: '1px solid var(--surface-glass-border)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--accent-gradient)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={18} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
                Import Document
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
                PDF, DOCX, TXT, MD, RTF supported
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#6c5ce7' : file ? 'var(--success)' : 'var(--surface-glass-border)'}`,
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-3)',
              cursor: 'pointer',
              background: dragging
                ? 'rgba(108, 92, 231, 0.06)'
                : file
                  ? 'rgba(0, 184, 148, 0.04)'
                  : 'var(--bg-tertiary)',
              transition: 'all 0.2s ease',
              minHeight: 160,
            }}
          >
            {file ? (
              <>
                <div style={{
                  width: 56, height: 56,
                  background: `${fileInfo.color}20`,
                  borderRadius: 'var(--radius-xl)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${fileInfo.color}40`,
                }}>
                  <FileText size={26} color={fileInfo.color} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                    {file.name}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {fileInfo.label} · {formatBytes(file.size)}
                  </p>
                </div>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  padding: '2px 10px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--surface-glass-border)',
                }}>
                  Click to change file
                </span>
              </>
            ) : (
              <>
                <div style={{
                  width: 56, height: 56,
                  background: dragging ? 'rgba(108, 92, 231, 0.15)' : 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-xl)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${dragging ? '#6c5ce7' : 'var(--surface-glass-border)'}`,
                  transition: 'all 0.2s',
                }}>
                  <Upload size={24} color={dragging ? '#6c5ce7' : 'var(--text-muted)'} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                    {dragging ? 'Drop it here!' : 'Drag & drop or click to browse'}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    PDF · DOCX · TXT · MD · RTF &nbsp;·&nbsp; Max 15 MB
                  </p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.rtf"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />

          {/* Supported formats chips */}
          {!file && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUPPORTED_TYPES.map(t => (
                <span key={t.ext} style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: 500,
                  background: `${t.color}18`,
                  color: t.color,
                  border: `1px solid ${t.color}35`,
                }}>
                  {t.ext.toUpperCase()}
                </span>
              ))}
            </div>
          )}

          {/* Insert mode selector */}
          {file && status !== 'success' && (
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--text-tertiary)',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Insert Mode
              </label>
              <button
                onClick={() => setShowModeMenu(v => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--surface-glass-border)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedMode.label}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {selectedMode.desc}
                  </div>
                </div>
                <ChevronDown size={16} color="var(--text-muted)" style={{ transition: 'transform 0.2s', transform: showModeMenu ? 'rotate(180deg)' : 'none' }} />
              </button>

              {showModeMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--surface-glass-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  overflow: 'hidden',
                  zIndex: 20,
                }}>
                  {INSERT_MODES.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => { setInsertMode(mode.id); setShowModeMenu(false); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: 'var(--space-3) var(--space-4)',
                        background: insertMode === mode.id ? 'var(--accent-primary-glow)' : 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--surface-glass-border)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        transition: 'background 0.1s',
                      }}
                    >
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-medium)',
                        color: insertMode === mode.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}>
                        {mode.label}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {mode.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status messages */}
          {status === 'error' && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(255, 107, 107, 0.08)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--error)',
              fontSize: 'var(--text-sm)',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {status === 'success' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(0, 184, 148, 0.08)',
              border: '1px solid rgba(0, 184, 148, 0.3)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--success)',
              fontSize: 'var(--text-sm)',
            }}>
              <CheckCircle size={16} />
              <span>Document imported successfully! Content added to editor.</span>
            </div>
          )}

          {/* Progress bar */}
          {status === 'uploading' && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
              }}>
                <span>Parsing document...</span>
                <span>{progress}%</span>
              </div>
              <div style={{
                height: 6,
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'var(--accent-gradient)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={!file || status === 'uploading' || status === 'success'}
              style={{ minWidth: 130 }}
            >
              {status === 'uploading' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="spinner" style={{ borderTopColor: 'white', width: 14, height: 14 }} />
                  Importing...
                </span>
              ) : status === 'success' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} />
                  Done!
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={14} />
                  Import Document
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentImportModal;

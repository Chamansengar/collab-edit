import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { yCollab } from 'y-codemirror.next';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CollaborativeEditor = ({ ydoc, provider, awareness, editorViewRef }) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Get the Yjs text type
  const ytext = useMemo(() => {
    if (!ydoc) return null;
    return ydoc.getText('content');
  }, [ydoc]);

  useEffect(() => {
    if (!editorRef.current || !ytext || !provider || !awareness) return;

    // Build extensions — note: dropCursor removed to avoid conflict with our custom drop handler
    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      rectangularSelection(),
      crosshairCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      history(),
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      oneDark,
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      // Yjs collaboration extension
      yCollab(ytext, awareness, { undoManager: false }),
      // Custom styling
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '15px',
        },
        '.cm-scroller': {
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          lineHeight: '1.7',
        },
        '.cm-content': {
          caretColor: '#00F5D4',
          padding: '16px 0',
        },
        '.cm-line': {
          padding: '0 24px',
        },
        '.cm-gutters': {
          background: '#0a0e1a',
          borderRight: '1px solid rgba(148, 163, 184, 0.12)',
          color: '#475569',
          fontSize: '12px',
        },
        '.cm-activeLineGutter': {
          background: '#1a2236',
          color: '#94a3b8',
        },
        '.cm-activeLine': {
          background: 'rgba(108, 92, 231, 0.05)',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
          background: 'rgba(108, 92, 231, 0.25) !important',
        },
        '.cm-cursor': {
          borderLeftColor: '#00F5D4',
          borderLeftWidth: '2px',
        },
        '.cm-matchingBracket': {
          background: 'rgba(0, 245, 212, 0.15)',
          color: '#00F5D4 !important',
          outline: '1px solid rgba(0, 245, 212, 0.3)',
        },
      }),
      EditorView.lineWrapping,
      // Prevent CodeMirror from handling file drops itself
      EditorView.domEventHandlers({
        drop(event) {
          // If this is a file drop, prevent CodeMirror from handling it
          // so our custom handler can process it
          if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            // Don't prevent default here — let it bubble to our wrapper handler
            return false;
          }
          return false;
        },
        dragover(event) {
          if (event.dataTransfer && event.dataTransfer.types && event.dataTransfer.types.includes('Files')) {
            event.preventDefault();
            return true; // handled
          }
          return false;
        },
      }),
    ];

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    if (editorViewRef) editorViewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
      if (editorViewRef) editorViewRef.current = null;
    };
  }, [ytext, provider, awareness]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show drag overlay for file drags
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(txt|md|docx|pdf)$/i)) {
      toast.error('Unsupported file format. Supported: PDF, DOCX, TXT, MD');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading(`Parsing "${file.name}"...`);

    try {
      const response = await api.post('/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const parsedText = response.data.text;

      if (!parsedText || parsedText.trim().length === 0) {
        toast.error('No text could be extracted from this file', { id: toastId });
        return;
      }

      if (viewRef.current && ytext) {
        // Insert at cursor position, or at the end if no focus
        const view = viewRef.current;
        const pos = view.state.selection.main.head ?? view.state.doc.length;
        
        // Insert via Yjs text type directly so changes propagate to collaborators
        const textToInsert = pos > 0 ? '\n' + parsedText : parsedText;
        ytext.insert(pos, textToInsert);
        
        toast.success(`"${file.name}" imported successfully!`, { id: toastId });
      } else {
        toast.error('Editor not ready. Please try again.', { id: toastId });
      }
    } catch (error) {
      console.error('Error parsing document:', error);
      toast.error(error.response?.data?.message || 'Failed to parse document', { id: toastId });
    }
  }, [ytext]);

  return (
    <div
      ref={editorRef}
      className={`collaborative-editor ${isDragging ? 'dragging' : ''}`}
      style={{ height: '100%', overflow: 'hidden', position: 'relative' }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(108, 92, 231, 0.12)',
            border: '2px dashed #6c5ce7',
            borderRadius: '8px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span style={{ color: '#6c5ce7', fontSize: '1.1rem', fontWeight: 600 }}>
              Drop document to import
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              PDF, DOCX, TXT, or Markdown
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeEditor;

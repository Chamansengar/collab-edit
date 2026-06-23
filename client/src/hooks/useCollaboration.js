import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { SocketIOProvider } from '../utils/SocketIOProvider';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for Yjs CRDT collaboration
 * Manages Yjs document, WebSocket provider, and awareness
 */
const useCollaboration = (documentId) => {
  const { user, getToken } = useAuth();
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [synced, setSynced] = useState(false);

  // Use state (not refs) so changes trigger re-renders in consuming components
  const [ydoc, setYdoc] = useState(null);
  const [provider, setProvider] = useState(null);

  // Keep a ref to track cleanup across effect re-runs
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!documentId || !user) return;

    // Clean up any previous session
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Create Yjs document
    const doc = new Y.Doc();

    // Use empty host for proxy or specific host
    const wsUrl = '/'; // Proxy will catch socket.io

    // Create WebSocket provider
    const prov = new SocketIOProvider(wsUrl, documentId, doc, {
      token: getToken(),
    });

    // Set awareness user info
    prov.awareness.setLocalStateField('user', {
      name: user.username,
      color: user.avatarColor || '#6C5CE7',
      id: user._id,
    });

    // Connection status
    const handleStatus = ({ status }) => {
      setConnected(status === 'connected');
    };
    prov.on('status', handleStatus);

    const handleSync = (isSynced) => {
      setSynced(isSynced);
    };
    prov.on('sync', handleSync);

    // Track collaborators from awareness
    const updateCollaborators = () => {
      const states = prov.awareness.getStates();
      const users = [];
      states.forEach((state, clientId) => {
        if (state.user && clientId !== doc.clientID) {
          users.push({
            clientId,
            ...state.user,
          });
        }
      });
      setCollaborators(users);
    };

    prov.awareness.on('change', updateCollaborators);
    updateCollaborators();

    // Set state — this triggers re-renders so the editor can mount
    setYdoc(doc);
    setProvider(prov);

    // Build cleanup function
    const cleanup = () => {
      prov.awareness.off('change', updateCollaborators);
      prov.off('status', handleStatus);
      prov.off('sync', handleSync);
      prov.disconnect();
      prov.destroy();
      doc.destroy();
      setYdoc(null);
      setProvider(null);
      setConnected(false);
      setSynced(false);
      setCollaborators([]);
    };

    cleanupRef.current = cleanup;

    return cleanup;
  }, [documentId, user, getToken]);

  return {
    ydoc,
    provider,
    awareness: provider?.awareness ?? null,
    connected,
    synced,
    collaborators,
  };
};

export default useCollaboration;

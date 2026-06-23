const Y = require('yjs');
const { encoding, decoding, mutex } = require('lib0');
const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const Document = require('../models/Document');

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/**
 * In-memory store of active Yjs documents
 * Key: documentId string, Value: { ydoc, awareness, conns, mux, saveTimeout }
 */
const docs = new Map();

/**
 * Debounce time for saving to MongoDB (ms)
 */
const SAVE_DEBOUNCE = 2000;

/**
 * Get or create a Yjs document for a given document ID
 */
const getYDoc = async (docId) => {
  if (docs.has(docId)) {
    return docs.get(docId);
  }

  const ydoc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(ydoc);
  const mux = mutex.createMutex();
  const conns = new Map();

  const docEntry = { ydoc, awareness, conns, mux, saveTimeout: null };

  // Load existing state from MongoDB
  try {
    const dbDoc = await Document.findById(docId).select('yjsState');
    if (dbDoc && dbDoc.yjsState) {
      Y.applyUpdate(ydoc, new Uint8Array(dbDoc.yjsState));
    }
  } catch (err) {
    console.error(`Error loading Yjs state for doc ${docId}:`, err);
  }

  // Set up update listener to persist changes
  ydoc.on('update', (update, origin) => {
    // Broadcast to all connected clients except origin
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    docEntry.conns.forEach((_, conn) => {
      if (conn !== origin) {
        try {
          conn.emit('yjs-message', Buffer.from(message));
        } catch (e) {
          // Connection closed
        }
      }
    });

    // Debounce save to MongoDB
    if (docEntry.saveTimeout) {
      clearTimeout(docEntry.saveTimeout);
    }
    docEntry.saveTimeout = setTimeout(() => {
      saveToMongo(docId, ydoc);
    }, SAVE_DEBOUNCE);
  });

  // Awareness update handler
  awareness.on('update', ({ added, updated, removed }, origin) => {
    const changedClients = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    );
    const message = encoding.toUint8Array(encoder);

    docEntry.conns.forEach((_, conn) => {
      if (conn !== origin) {
        try {
          conn.emit('yjs-message', Buffer.from(message));
        } catch (e) {
          // Connection closed
        }
      }
    });
  });

  docs.set(docId, docEntry);
  return docEntry;
};

/**
 * Save Yjs document state to MongoDB
 */
const saveToMongo = async (docId, ydoc) => {
  try {
    const state = Y.encodeStateAsUpdate(ydoc);
    await Document.findByIdAndUpdate(docId, {
      yjsState: Buffer.from(state),
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error(`Error saving Yjs state for doc ${docId}:`, err);
  }
};

/**
 * Handle a new socket connection for a document
 */
const handleConnection = async (socket, docId, user) => {
  const docEntry = await getYDoc(docId);
  const { ydoc, awareness, conns, mux } = docEntry;

  // Register connection
  conns.set(socket, new Set());

  // Set awareness state for this user
  awareness.setLocalStateField('user', {
    name: user.username,
    color: user.avatarColor,
    id: user._id.toString(),
  });

  // Send initial sync
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, ydoc);
  socket.emit('yjs-message', Buffer.from(encoding.toUint8Array(encoder)));

  // Send current awareness states
  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awarenessStates.keys())
      )
    );
    socket.emit('yjs-message', Buffer.from(encoding.toUint8Array(awarenessEncoder)));
  }

  // Handle incoming messages from this client
  socket.on('yjs-message', (message) => {
    try {
      const buf = new Uint8Array(message);
      const decoder = decoding.createDecoder(buf);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC:
          mux(() => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_SYNC);
            syncProtocol.readSyncMessage(decoder, encoder, ydoc, socket);
            const reply = encoding.toUint8Array(encoder);
            // Only send reply if there's content beyond the message type
            if (encoding.length(encoder) > 1) {
              socket.emit('yjs-message', Buffer.from(reply));
            }
          });
          break;

        case MESSAGE_AWARENESS:
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            socket
          );
          break;
      }
    } catch (err) {
      console.error('Error processing Yjs message:', err);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    conns.delete(socket);

    // Remove awareness state
    awarenessProtocol.removeAwarenessStates(
      awareness,
      [ydoc.clientID],
      null
    );

    // If no more connections, save and clean up after a delay
    if (conns.size === 0) {
      setTimeout(async () => {
        if (conns.size === 0) {
          // Final save
          await saveToMongo(docId, ydoc);

          // Clear any pending save
          if (docEntry.saveTimeout) {
            clearTimeout(docEntry.saveTimeout);
          }

          // Destroy and remove
          awareness.destroy();
          ydoc.destroy();
          docs.delete(docId);
        }
      }, 30000); // Wait 30s before cleanup
    }
  });
};

module.exports = {
  handleConnection,
  getYDoc,
  docs,
};

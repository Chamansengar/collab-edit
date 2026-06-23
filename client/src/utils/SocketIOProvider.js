import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { io } from 'socket.io-client';
import { Observable } from 'lib0/observable';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

export class SocketIOProvider extends Observable {
  constructor(url, roomname, ydoc, { awareness, token } = {}) {
    super();
    this.url = url;
    this.roomname = roomname;
    this.doc = ydoc;
    this.awareness = awareness || new awarenessProtocol.Awareness(ydoc);
    this._synced = false;
    
    this.socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this._synced = false;
      this.emit('status', [{ status: 'connected' }]);
      this.socket.emit('join-document', this.roomname);

      // Send sync step 1
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(encoder, this.doc);
      this.socket.emit('yjs-message', encoding.toUint8Array(encoder));

      // Send local awareness state
      if (this.awareness.getLocalState() !== null) {
        const encoderAwareness = encoding.createEncoder();
        encoding.writeVarUint(encoderAwareness, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoderAwareness,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
        );
        this.socket.emit('yjs-message', encoding.toUint8Array(encoderAwareness));
      }
    });

    this.socket.on('disconnect', () => {
      this._synced = false;
      this.emit('sync', [false]);
      this.emit('status', [{ status: 'disconnected' }]);
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        Array.from(this.awareness.getStates().keys()).filter((client) => client !== this.doc.clientID),
        'disconnect'
      );
    });

    this.socket.on('yjs-message', (message) => {
      const buf = new Uint8Array(message);
      const decoder = decoding.createDecoder(buf);
      const encoder = encoding.createEncoder();
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC:
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
          
          // If the encoder has more than just the message type, send the reply
          if (encoding.length(encoder) > 1) {
            this.socket.emit('yjs-message', encoding.toUint8Array(encoder));
          }

          // SyncStep2 means the server sent us its state — we're synced
          // syncMessageType === 1 means we processed a SyncStep2
          if (syncMessageType === 1 && !this._synced) {
            this._synced = true;
            this.emit('sync', [true]);
          }
          break;
        case MESSAGE_AWARENESS:
          awarenessProtocol.applyAwarenessUpdate(
            this.awareness,
            decoding.readVarUint8Array(decoder),
            this
          );
          break;
      }
    });

    this.updateHandler = (update, origin) => {
      if (origin !== this) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.writeUpdate(encoder, update);
        this.socket.emit('yjs-message', encoding.toUint8Array(encoder));
      }
    };
    this.doc.on('update', this.updateHandler);

    this.awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
      if (origin !== this) {
        const changedClients = added.concat(updated, removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
        );
        this.socket.emit('yjs-message', encoding.toUint8Array(encoder));
      }
    };
    this.awareness.on('update', this.awarenessUpdateHandler);
  }

  disconnect() {
    this.socket.disconnect();
  }

  destroy() {
    this.disconnect();
    this.doc.off('update', this.updateHandler);
    this.awareness.off('update', this.awarenessUpdateHandler);
    this.awareness.destroy();
  }
}

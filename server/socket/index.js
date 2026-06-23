const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/tokenUtils');
const User = require('../models/User');
const Document = require('../models/Document');
const { handlePresence } = require('./presenceHandler');
const { handleConnection: handleYjsConnection } = require('../services/yjsService');

/**
 * Initialize Socket.IO server with authentication and room management
 */
const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 Socket connected: ${user.username} (${socket.id})`);

    // Handle presence (join/leave rooms, cursors)
    handlePresence(io, socket, user);

    // Handle Yjs collaboration
    socket.on('join-document', async (docId) => {
      try {
        // Verify document access
        const doc = await Document.findById(docId);
        if (!doc || !doc.hasAccess(user._id, 'viewer')) {
          socket.emit('error', { message: 'Access denied to document' });
          return;
        }

        // Set up Yjs collaboration for this document
        await handleYjsConnection(socket, docId, user);
      } catch (err) {
        console.error('Error joining document for Yjs:', err);
        socket.emit('error', { message: 'Error joining document' });
      }
    });
  });

  return io;
};

module.exports = { initSocket };

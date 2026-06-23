/**
 * Tracks online users per document and handles presence events
 */
const onlineUsers = new Map(); // docId -> Map<socketId, { user, cursor }>

const handlePresence = (io, socket, user) => {
  /**
   * User joins a document room
   */
  socket.on('join-document', (docId) => {
    socket.join(docId);
    socket.docId = docId;

    // Track user presence
    if (!onlineUsers.has(docId)) {
      onlineUsers.set(docId, new Map());
    }

    const docUsers = onlineUsers.get(docId);
    docUsers.set(socket.id, {
      _id: user._id.toString(),
      username: user.username,
      avatarColor: user.avatarColor,
      cursor: null,
    });

    // Broadcast updated user list to room
    io.to(docId).emit('presence-update', {
      users: Array.from(docUsers.values()),
    });

    console.log(
      `👤 ${user.username} joined document ${docId} (${docUsers.size} users)`
    );
  });

  /**
   * User leaves a document room
   */
  socket.on('leave-document', (docId) => {
    socket.leave(docId);
    removeUserFromDoc(io, socket, docId);
  });

  /**
   * Cursor position update
   */
  socket.on('cursor-update', (data) => {
    const { docId, cursor } = data;
    const docUsers = onlineUsers.get(docId);

    if (docUsers && docUsers.has(socket.id)) {
      docUsers.get(socket.id).cursor = cursor;

      // Broadcast to others in the room
      socket.to(docId).emit('cursor-move', {
        userId: user._id.toString(),
        username: user.username,
        avatarColor: user.avatarColor,
        cursor,
      });
    }
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', () => {
    if (socket.docId) {
      removeUserFromDoc(io, socket, socket.docId);
    }
    console.log(`👋 ${user.username} disconnected`);
  });
};

/**
 * Remove user from document presence tracking
 */
const removeUserFromDoc = (io, socket, docId) => {
  const docUsers = onlineUsers.get(docId);
  if (docUsers) {
    docUsers.delete(socket.id);

    if (docUsers.size === 0) {
      onlineUsers.delete(docId);
    } else {
      io.to(docId).emit('presence-update', {
        users: Array.from(docUsers.values()),
      });
    }
  }
};

module.exports = { handlePresence, onlineUsers };

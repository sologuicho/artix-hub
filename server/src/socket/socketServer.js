const { Server } = require('socket.io');
const { verifyAuthToken } = require('../core/auth/policy');
const { ALLOWED_ORIGINS } = require('../config/urls');

let io;

const initializeSocket = (server) => {
  const socketOrigin =
    ALLOWED_ORIGINS.length === 0
      ? 'http://localhost:5173'
      : ALLOWED_ORIGINS.length === 1
        ? ALLOWED_ORIGINS[0]
        : ALLOWED_ORIGINS;

  io = new Server(server, {
    cors: {
      origin: socketOrigin,
      credentials: true
    }
  });

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const { user, decoded } = await verifyAuthToken(token);
      socket.userId = user.id;
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Send notification to user
const sendNotification = (userId, notification) => {
  const io = getIO();
  io.to(`user:${userId}`).emit('notification', notification);
};

// Send notification to multiple users
const sendNotificationToUsers = (userIds, notification) => {
  const io = getIO();
  userIds.forEach(userId => {
    io.to(`user:${userId}`).emit('notification', notification);
  });
};

module.exports = {
  initializeSocket,
  getIO,
  sendNotification,
  sendNotificationToUsers
};

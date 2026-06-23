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
    cors: { origin: socketOrigin, credentials: true }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication error'));
      const { user, decoded } = await verifyAuthToken(token);
      socket.userId = user.id;
      socket.user = { id: user.id, name: user.name, username: user.username, avatar: user.avatar };
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    // Personal notification room
    socket.join(`user:${socket.userId}`);

    // ── WebRTC Signaling ─────────────────────────────────────────────────────
    // Broadcaster announces stream is live
    socket.on('stream:ready', ({ eventId }) => {
      activeBroadcasters.set(eventId, socket.userId);
      // Notify everyone already in the lobby
      socket.to(`event-lobby:${eventId}`).emit('stream:broadcaster-online', {
        broadcasterId: socket.userId,
      });
    });

    // Viewer wants to receive the stream
    socket.on('stream:viewer-ready', ({ eventId, broadcasterId }) => {
      // Tell broadcaster that this viewer wants in
      io.to(`user:${broadcasterId}`).emit('stream:viewer-joined', {
        viewerId: socket.userId,
      });
    });

    // Broadcaster → Viewer: SDP offer
    socket.on('stream:offer', ({ to, offer }) => {
      io.to(`user:${to}`).emit('stream:offer', { from: socket.userId, offer });
    });

    // Viewer → Broadcaster: SDP answer
    socket.on('stream:answer', ({ to, answer }) => {
      io.to(`user:${to}`).emit('stream:answer', { from: socket.userId, answer });
    });

    // ICE candidate (bidirectional)
    socket.on('stream:ice', ({ to, candidate }) => {
      io.to(`user:${to}`).emit('stream:ice', { from: socket.userId, candidate });
    });

    // Broadcaster ends the stream
    socket.on('stream:end', ({ eventId }) => {
      activeBroadcasters.delete(eventId);
      io.to(`event-lobby:${eventId}`).emit('stream:ended');
    });

    // ── Event Lobby ──────────────────────────────────────────────────────────
    socket.on('lobby:join', async ({ eventId }) => {
      if (!eventId) return;
      const room = `event-lobby:${eventId}`;
      socket.join(room);

      // Track participant in room
      const participants = getParticipants(room);
      participants.set(socket.userId, socket.user);

      // Broadcast updated participant list to everyone in the room
      io.to(room).emit('lobby:participants', Array.from(participants.values()));

      // Notify others this user joined
      socket.to(room).emit('lobby:joined', { user: socket.user });

      // Tell the new joiner if a broadcast is already live
      const broadcasterId = activeBroadcasters.get(eventId);
      if (broadcasterId && broadcasterId !== socket.userId) {
        socket.emit('stream:broadcaster-online', { broadcasterId });
      }
    });

    socket.on('lobby:leave', ({ eventId }) => {
      if (!eventId) return;
      const room = `event-lobby:${eventId}`;
      socket.leave(room);
      const participants = getParticipants(room);
      participants.delete(socket.userId);
      io.to(room).emit('lobby:participants', Array.from(participants.values()));
      socket.to(room).emit('lobby:left', { userId: socket.userId });
    });

    socket.on('lobby:message', async ({ eventId, content }) => {
      if (!eventId || !content?.trim()) return;
      const room = `event-lobby:${eventId}`;

      // Persist to DB
      try {
        const prisma = require('../prismaClient');
        const msg = await prisma.eventLobbyMessage.create({
          data: { eventId, userId: socket.userId, content: content.trim() },
          include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
        });
        io.to(room).emit('lobby:message', msg);
      } catch (err) {
        socket.emit('lobby:error', { message: 'Error sending message' });
      }
    });

    socket.on('disconnect', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('event-lobby:')) {
          const eventId = room.replace('event-lobby:', '');
          const participants = getParticipants(room);
          participants.delete(socket.userId);
          io.to(room).emit('lobby:participants', Array.from(participants.values()));
          socket.to(room).emit('lobby:left', { userId: socket.userId });

          // If broadcaster disconnects, end the stream
          if (activeBroadcasters.get(eventId) === socket.userId) {
            activeBroadcasters.delete(eventId);
            io.to(room).emit('stream:ended');
          }
        }
      }
    });
  });

  return io;
};

// In-memory participant map per lobby room
const lobbyParticipants = new Map(); // room -> Map<userId, user>
// Active broadcasters per event
const activeBroadcasters = new Map(); // eventId -> userId
const getParticipants = (room) => {
  if (!lobbyParticipants.has(room)) lobbyParticipants.set(room, new Map());
  return lobbyParticipants.get(room);
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

const sendNotification = (userId, notification) => {
  getIO().to(`user:${userId}`).emit('notification', notification);
};

const sendNotificationToUsers = (userIds, notification) => {
  const io = getIO();
  userIds.forEach(userId => io.to(`user:${userId}`).emit('notification', notification));
};

module.exports = { initializeSocket, getIO, sendNotification, sendNotificationToUsers };

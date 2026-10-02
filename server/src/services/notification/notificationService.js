const prisma = require('../../prismaClient');
const { sendNotification } = require('../../socket/socketServer');
const logger = require('../../lib/logger');

/**
 * Creates a notification in the DB and pushes it via Socket.IO.
 * This is the single internal API for all notification dispatch.
 * Used by: followService, commentService, reactionService, collaborationService, blogService, etc.
 */
const notify = async (userId, type, title, message, link = null) => {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, message, link }
    });

    // Real-time push
    sendNotification(userId, notification);

    return notification;
  } catch (error) {
    logger.error({ err: error }, '[NotificationService] Error creating notification');
    return null;
  }
};

module.exports = { notify };

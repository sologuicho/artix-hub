const prisma = require('../prismaClient');
const { notify } = require('../services/notification/notificationService');

// Re-export notify as createNotification for backward compatibility with other controllers
// (followController, reactionController, collaborationController, blogController, commentController)
exports.createNotification = notify;


// Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unreadOnly = false, limit = 50 } = req.query;

    const where = { userId };
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false }
    });

    res.json({
      ok: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ ok: false, message: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ ok: false, message: 'Failed to mark notification as read' });
  }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ ok: false, message: 'Failed to mark all as read' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ ok: false, message: 'Notification not found' });
    }

    await prisma.notification.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete notification' });
  }
};







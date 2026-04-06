const prisma = require('../prismaClient');
const { createNotification } = require('./notificationController');

// Follow/Unfollow user
exports.toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({ ok: false, message: 'Cannot follow yourself' });
    }

    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId
        }
      }
    });

    if (existing) {
      // Unfollow
      await prisma.follow.delete({ where: { id: existing.id } });
      return res.json({ ok: true, following: false, message: 'Unfollowed user' });
    } else {
      // Follow
      const follow = await prisma.follow.create({
        data: {
          followerId: currentUserId,
          followingId: userId
        }
      });

      // Send notification
      const user = await prisma.user.findUnique({ where: { id: userId } });
      await createNotification(
        userId,
        'follow',
        'Nuevo seguidor',
        `${req.user.name || req.user.username} comenzó a seguirte`,
        `/profile/${userId}`
      );

      return res.json({ ok: true, following: true, follow });
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    res.status(500).json({ ok: false, message: 'Failed to toggle follow' });
  }
};

// Get user's followers
exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            bio: true,
            occupation: true,
            country: true,
            interests: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ ok: true, followers: followers.map(f => f.follower) });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch followers' });
  }
};

// Get users that a user is following
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            bio: true,
            occupation: true,
            country: true,
            interests: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ ok: true, following: following.map(f => f.following) });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch following' });
  }
};

// Check if user is following another user
exports.checkFollow = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId
        }
      }
    });

    res.json({ ok: true, following: !!follow });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ ok: false, message: 'Failed to check follow status' });
  }
};



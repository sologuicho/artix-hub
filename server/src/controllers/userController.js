const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');

// Suggested users — ordered by follower count, excludes current user
exports.getSuggestedUsers = async (req, res) => {
  try {
    const currentUserId = req.user?.id || null;
    const users = await prisma.user.findMany({
      where: {
        id: currentUserId ? { not: currentUserId } : undefined,
        username: { not: null },
      },
      select: {
        id: true, name: true, username: true, avatar: true, institution: true,
        _count: { select: { followers: true, articles: true, research: true } },
      },
      orderBy: { followers: { _count: 'desc' } },
      take: 5,
    });
    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Failed to fetch suggested users' });
  }
};

// Search users by username or name
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ ok: true, users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true
      },
      take: 10
    });

    res.json({ ok: true, users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ ok: false, message: 'Failed to search users' });
  }
};

// Get public user profile with stats
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Try to find by ID first, then by username
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        country: true,
        occupation: true,
        interests: true,
        createdAt: true
      }
    });

    // If not found by ID, try by username
    if (!user) {
      user = await prisma.user.findUnique({
        where: { username: userId },
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          bio: true,
          country: true,
          occupation: true,
          interests: true,
          createdAt: true
        }
      });
    }

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    // Get stats using the user's ID
    const [articlesCount, researchCount, eventsCount, postsCount, followersCount, followingCount] = await Promise.all([
      prisma.article.count({ where: { authorId: user.id, status: 'published' } }),
      prisma.research.count({ where: { authorId: user.id, status: 'published' } }),
      prisma.event.count({ where: { creatorId: user.id } }),
      prisma.blogPost.count({ where: { authorId: user.id } }),
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } })
    ]);

    res.json({
      ok: true,
      user,
      stats: {
        articles: articlesCount,
        research: researchCount,
        events: eventsCount,
        posts: postsCount,
        followers: followersCount,
        following: followingCount
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch user profile' });
  }
};// Change password (local accounts only)
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return res.status(400).json({ ok: false, message: 'Esta cuenta usa autenticación OAuth y no tiene contraseña local' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, message: 'La contraseña actual es incorrecta' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    // Increment tokenVersion to revoke all existing sessions
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, tokenVersion: { increment: 1 } }
    });

    res.json({ ok: true, message: 'Contraseña actualizada correctamente. Por seguridad, se han cerrado todas las sesiones activas.' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ ok: false, message: 'Error al cambiar la contraseña' });
  }
};

// Delete account permanently
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete user (Prisma cascades: articles, research, events, comments, etc.)
    await prisma.user.delete({ where: { id: userId } });

    // Clear auth cookies
    res.clearCookie('session');
    res.clearCookie('csrf');
    res.json({ ok: true, message: 'Cuenta eliminada permanentemente' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ ok: false, message: 'Error al eliminar la cuenta' });
  }
};


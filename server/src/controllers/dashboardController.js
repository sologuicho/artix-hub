const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get user dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get counts
    const [articlesCount, postsCount, eventsCount] = await Promise.all([
      prisma.article.count({
        where: { authorId: userId }
      }),
      prisma.blogPost.count({
        where: { authorId: userId }
      }),
      prisma.event.count({
        where: { creatorId: userId }
      })
    ]);

    // Get recent articles
    const recentArticles = await prisma.article.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        category: true,
        coverUrl: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true
          }
        }
      }
    });

    // Get upcoming events
    const upcomingEvents = await prisma.event.findMany({
      where: {
        creatorId: userId,
        date: {
          gte: new Date()
        }
      },
      orderBy: { date: 'asc' },
      take: 5
    });

    // Get recent blog posts
    const recentPosts = await prisma.blogPost.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        coverUrl: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true
          }
        }
      }
    });

    // Get draft articles (only actual drafts, not published or reviewing)
    const drafts = await prisma.article.findMany({
      where: {
        authorId: userId,
        status: {
          in: ['draft'] // Only show actual drafts, exclude 'reviewing' and 'published'
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true
          }
        }
      }
    });

    res.json({
      ok: true,
      stats: {
        articles: articlesCount,
        posts: postsCount,
        events: eventsCount
      },
      recentArticles,
      upcomingEvents,
      recentPosts,
      drafts
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch dashboard statistics' });
  }
};



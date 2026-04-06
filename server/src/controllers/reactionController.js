const prisma = require('../prismaClient');
const { createNotification } = require('./notificationController');

// Toggle reaction on post or article
exports.toggleReaction = async (req, res) => {
  try {
    const { postId, articleId, type } = req.body;
    const userId = req.user.id;

    if (!postId && !articleId) {
      return res.status(400).json({ ok: false, message: 'postId or articleId is required' });
    }

    if (!type) {
      return res.status(400).json({ ok: false, message: 'Reaction type is required' });
    }

    // Check if reaction already exists
    const where = { 
      userId, 
      type,
      ...(postId ? { postId } : { postId: null }),
      ...(articleId ? { articleId } : { articleId: null })
    };

    const existing = await prisma.reaction.findFirst({ where });

    if (existing) {
      // Remove reaction
      await prisma.reaction.delete({ where: { id: existing.id } });
      return res.json({ ok: true, reacted: false, message: 'Reaction removed' });
    } else {
      // Add reaction
      const reaction = await prisma.reaction.create({
        data: {
          userId,
          postId: postId || null,
          articleId: articleId || null,
          type
        }
      });

      // Create notification for post/article author (if not the reactor)
      if (postId) {
        const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { authorId: true, title: true } });
        if (post && post.authorId !== userId) {
          await createNotification(
            post.authorId,
            'reaction',
            'Nueva reacción',
            `${req.user.name || req.user.username} reaccionó a tu post "${post.title}"`,
            `/blog/${postId}`
          );
        }
      } else if (articleId) {
        const article = await prisma.article.findUnique({ where: { id: articleId }, select: { authorId: true, title: true } });
        if (article && article.authorId !== userId) {
          await createNotification(
            article.authorId,
            'reaction',
            'Nueva reacción',
            `${req.user.name || req.user.username} reaccionó a tu artículo "${article.title}"`,
            `/articles/${articleId}`
          );
        }
      }

      return res.json({ ok: true, reacted: true, reaction });
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ ok: false, message: 'Failed to toggle reaction' });
  }
};

// Get reaction counts for post or article
exports.getReactionCounts = async (req, res) => {
  try {
    const { postId, articleId } = req.query;

    if (!postId && !articleId) {
      return res.status(400).json({ ok: false, message: 'postId or articleId is required' });
    }

    const where = {};
    if (postId) where.postId = postId;
    if (articleId) where.articleId = articleId;

    const reactions = await prisma.reaction.groupBy({
      by: ['type'],
      where,
      _count: {
        type: true
      }
    });

    const counts = {};
    reactions.forEach(r => {
      counts[r.type] = r._count.type;
    });

    res.json({ ok: true, counts });
  } catch (error) {
    console.error('Error getting reaction counts:', error);
    res.status(500).json({ ok: false, message: 'Failed to get reaction counts' });
  }
};

// Get user's reactions
exports.getUserReactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId, articleId } = req.query;

    const where = { userId };
    if (postId) where.postId = postId;
    if (articleId) where.articleId = articleId;

    const reactions = await prisma.reaction.findMany({ where });

    res.json({ ok: true, reactions });
  } catch (error) {
    console.error('Error getting user reactions:', error);
    res.status(500).json({ ok: false, message: 'Failed to get user reactions' });
  }
};


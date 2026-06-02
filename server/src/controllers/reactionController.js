const prisma = require('../prismaClient');
const { createNotification } = require('./notificationController');

// Toggle reaction on post, article, or research
exports.toggleReaction = async (req, res) => {
  try {
    const { postId, articleId, researchId, type } = req.body;
    const userId = req.user.id;

    if (!postId && !articleId && !researchId) {
      return res.status(400).json({ ok: false, message: 'postId, articleId, or researchId is required' });
    }

    if (!type) {
      return res.status(400).json({ ok: false, message: 'Reaction type is required' });
    }

    // Check if reaction already exists
    const where = {
      userId,
      type,
      postId: postId || null,
      articleId: articleId || null,
      researchId: researchId || null,
    };

    const existing = await prisma.reaction.findFirst({ where });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return res.json({ ok: true, reacted: false });
    }

    const reaction = await prisma.reaction.create({
      data: { userId, postId: postId || null, articleId: articleId || null, researchId: researchId || null, type }
    });

    // Notify content author if different from reactor
    const actor = req.user.name || req.user.username;
    if (postId) {
      const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { authorId: true, title: true } });
      if (post && post.authorId !== userId) {
        await createNotification(post.authorId, 'reaction', 'Nueva reacción',
          `${actor} reaccionó a tu post "${post.title}"`, `/blog/${postId}`);
      }
    } else if (articleId) {
      const article = await prisma.article.findUnique({ where: { id: articleId }, select: { authorId: true, title: true } });
      if (article && article.authorId !== userId) {
        await createNotification(article.authorId, 'reaction', 'Nueva reacción',
          `${actor} reaccionó a tu artículo "${article.title}"`, `/articles/${articleId}`);
      }
    } else if (researchId) {
      const research = await prisma.research.findUnique({ where: { id: researchId }, select: { authorId: true, title: true } });
      if (research && research.authorId !== userId) {
        await createNotification(research.authorId, 'reaction', 'Nueva reacción',
          `${actor} recomendó tu investigación "${research.title}"`, `/research/${researchId}`);
      }
    }

    return res.json({ ok: true, reacted: true, reaction });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ ok: false, message: 'Failed to toggle reaction' });
  }
};

// Get reaction counts for post, article, or research
exports.getReactionCounts = async (req, res) => {
  try {
    const { postId, articleId, researchId } = req.query;

    if (!postId && !articleId && !researchId) {
      return res.status(400).json({ ok: false, message: 'postId, articleId, or researchId is required' });
    }

    const where = {};
    if (postId) where.postId = postId;
    if (articleId) where.articleId = articleId;
    if (researchId) where.researchId = researchId;

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
    const { postId, articleId, researchId } = req.query;

    const where = { userId };
    if (postId) where.postId = postId;
    if (articleId) where.articleId = articleId;
    if (researchId) where.researchId = researchId;

    const reactions = await prisma.reaction.findMany({ where });

    res.json({ ok: true, reactions });
  } catch (error) {
    console.error('Error getting user reactions:', error);
    res.status(500).json({ ok: false, message: 'Failed to get user reactions' });
  }
};


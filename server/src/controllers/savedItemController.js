const prisma = require('../prismaClient');

// Save item (article, research, post, or event)
exports.saveItem = async (req, res) => {
  try {
    const { articleId, researchId, postId, eventId } = req.body;
    const userId = req.user.id;

    if (!articleId && !researchId && !postId && !eventId) {
      return res.status(400).json({ ok: false, message: 'One of articleId, researchId, postId, or eventId is required' });
    }

    // Check if already saved
    const where = { userId };
    if (articleId) where.articleId = articleId;
    if (researchId) where.researchId = researchId;
    if (postId) where.postId = postId;
    if (eventId) where.eventId = eventId;

    const existing = await prisma.savedItem.findFirst({ where });

    if (existing) {
      // Remove from saved
      await prisma.savedItem.delete({ where: { id: existing.id } });
      return res.json({ ok: true, saved: false, message: 'Item removed from saved' });
    } else {
      // Add to saved
      const savedItem = await prisma.savedItem.create({
        data: {
          userId,
          articleId: articleId || null,
          researchId: researchId || null,
          postId: postId || null,
          eventId: eventId || null
        }
      });
      return res.json({ ok: true, saved: true, savedItem });
    }
  } catch (error) {
    console.error('Error saving item:', error);
    res.status(500).json({ ok: false, message: 'Failed to save item' });
  }
};

// Get user's saved items
exports.getSavedItems = async (req, res) => {
  try {
    const userId = req.user.id;

    const savedItems = await prisma.savedItem.findMany({
      where: { userId },
      include: {
        article: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        research: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        event: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ ok: true, savedItems });
  } catch (error) {
    console.error('Error fetching saved items:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch saved items' });
  }
};

// Check if item is saved
exports.checkSaved = async (req, res) => {
  try {
    const { articleId, researchId, postId, eventId } = req.query;
    const userId = req.user.id;

    const where = { userId };
    if (articleId) where.articleId = articleId;
    if (researchId) where.researchId = researchId;
    if (postId) where.postId = postId;
    if (eventId) where.eventId = eventId;

    const saved = await prisma.savedItem.findFirst({ where });

    res.json({ ok: true, saved: !!saved });
  } catch (error) {
    console.error('Error checking saved status:', error);
    res.status(500).json({ ok: false, message: 'Failed to check saved status' });
  }
};



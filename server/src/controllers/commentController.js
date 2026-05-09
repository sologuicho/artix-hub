const prisma = require('../prismaClient');
const { createNotification } = require('./notificationController');

// Add comment to post, article, research, or discussion
exports.addComment = async (req, res) => {
  try {
    const { postId, articleId, researchId, discussionId, content, parentId } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'Comment content is required' });
    }

    // Validate that only one target is provided
    const targetCount = [postId, articleId, researchId, discussionId].filter(Boolean).length;
    if (targetCount !== 1) {
      return res.status(400).json({ ok: false, message: 'Exactly one of postId, articleId, researchId, or discussionId is required' });
    }

    // If parentId is provided, verify it exists and belongs to the same target
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { postId: true, articleId: true, researchId: true, discussionId: true }
      });

      if (!parent) {
        return res.status(404).json({ ok: false, message: 'Parent comment not found' });
      }

      // Verify parent belongs to same target
      if (postId && !parent.postId) {
        return res.status(400).json({ ok: false, message: 'Parent comment does not belong to this post' });
      }
      if (articleId && !parent.articleId) {
        return res.status(400).json({ ok: false, message: 'Parent comment does not belong to this article' });
      }
      if (researchId && !parent.researchId) {
        return res.status(400).json({ ok: false, message: 'Parent comment does not belong to this research' });
      }
      if (discussionId && !parent.discussionId) {
        return res.status(400).json({ ok: false, message: 'Parent comment does not belong to this discussion' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorId: userId,
        postId: postId || null,
        articleId: articleId || null,
        researchId: researchId || null,
        discussionId: discussionId || null,
        parentId: parentId || null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        parent: {
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
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { replies: true }
        }
      }
    });

    // Create notification for post/article/discussion author (if not the commenter)
    let targetAuthorId = null;
    if (postId) {
      const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { authorId: true, title: true } });
      if (post && post.authorId !== userId) {
        targetAuthorId = post.authorId;
        await createNotification(
          post.authorId,
          'comment',
          'Nuevo comentario',
          `${req.user.name || req.user.username} comentó en tu post "${post.title}"`,
          `/blog/${postId}`
        );
      }
    } else if (articleId) {
      const article = await prisma.article.findUnique({ where: { id: articleId }, select: { authorId: true, title: true } });
      if (article && article.authorId !== userId) {
        targetAuthorId = article.authorId;
        await createNotification(
          article.authorId,
          'comment',
          'Nuevo comentario',
          `${req.user.name || req.user.username} comentó en tu artículo "${article.title}"`,
          `/articles/${articleId}`
        );
      }
    } else if (researchId) {
      const research = await prisma.research.findUnique({ where: { id: researchId }, select: { authorId: true, title: true } });
      if (research && research.authorId !== userId) {
        targetAuthorId = research.authorId;
        await createNotification(
          research.authorId,
          'comment',
          'Nuevo comentario',
          `${req.user.name || req.user.username} comentó en tu investigación "${research.title}"`,
          `/research/${researchId}`
        );
      }
    }

    // If replying to a comment, notify the parent comment author
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { authorId: true } });
      if (parent && parent.authorId !== userId && parent.authorId !== targetAuthorId) {
        await createNotification(
          parent.authorId,
          'comment',
          'Nueva respuesta',
          `${req.user.name || req.user.username} respondió a tu comentario`,
          postId ? `/blog/${postId}` : articleId ? `/articles/${articleId}` : researchId ? `/research/${researchId}` : null
        );
      }
    }

    res.status(201).json({ ok: true, comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ ok: false, message: 'Failed to add comment' });
  }
};

// Get comments for post, article, research, or discussion
exports.getComments = async (req, res) => {
  try {
    const { postId, articleId, researchId, discussionId } = req.query;

    const where = {};
    if (postId) where.postId = postId;
    if (articleId) where.articleId = articleId;
    if (researchId) where.researchId = researchId;
    if (discussionId) where.discussionId = discussionId;
    where.parentId = null; // Only get top-level comments

    const comments = await prisma.comment.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            },
            _count: {
              select: { replies: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { replies: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ ok: true, comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch comments' });
  }
};

// Update comment
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Comment not found' });
    }

    if (existing.authorId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { content: content.trim() },
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
    });

    res.json({ ok: true, comment });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ ok: false, message: 'Failed to update comment' });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Comment not found' });
    }

    if (existing.authorId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    await prisma.comment.delete({ where: { id } });
    res.json({ ok: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete comment' });
  }
};


const prisma = require('../prismaClient');

// Helper: only author or admin can manage content
const canManageContent = (authorId, userId, userRole) =>
  authorId === userId || userRole === 'admin';

// Get unique categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.blogPost.findMany({
      where: {
        category: { not: null },
        archived: false
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    const categoryList = categories
      .map(c => c.category)
      .filter(c => c && c.trim() !== '')
      .sort();

    res.json({ ok: true, categories: categoryList });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch categories' });
  }
};

// Get all blog posts with pagination and filters
exports.getAllBlogPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, author, dateFrom, dateTo } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    // By default, exclude archived posts unless explicitly requested
    if (!req.query.includeArchived) {
      where.archived = false;
    }
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (req.query.authorId) {
      where.authorId = req.query.authorId;
    } else if (author) {
      where.author = {
        OR: [
          { name: { contains: author, mode: 'insensitive' } },
          { username: { contains: author, mode: 'insensitive' } },
        ]
      };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({
      ok: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch blog posts' });
  }
};

// Get single blog post
exports.getBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ ok: false, message: 'Blog post not found' });
    }

    res.json({ ok: true, post });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch blog post' });
  }
};

// Create blog post
exports.createBlogPost = async (req, res) => {
  try {
    const { title, content, category, coverUrl, imageUrl, videoUrl, documents, mentions, publishAsArtixResearch } = req.body;
    const userId = req.user.id;
    
    // Only admin users can publish as Artix Research
    let authorId = userId;
    if (publishAsArtixResearch && req.user.role === 'admin') {
      // Buscar o crear el usuario Artix Research
      let artixUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'artixresearch' },
            { username: 'artix-research' },
            { name: 'Artix Research' }
          ]
        }
      });
      
      if (!artixUser) {
        // Crear el usuario Artix Research si no existe
        artixUser = await prisma.user.create({
          data: {
            provider: 'system',
            providerId: 'artix-research',
            username: 'artixresearch',
            name: 'Artix Research',
            email: 'research@artixhub.com',
            role: 'user',
            profileComplete: true,
            bio: 'Cuenta oficial de investigación de Artix Hub. Publicamos artículos científicos, investigaciones avanzadas y contenido académico de alta calidad sobre física cuántica, inteligencia artificial, química computacional y más.',
            occupation: 'Organización de Investigación',
            country: 'Global',
            interests: ['Quantum Physics', 'AI Research', 'Chemistry', 'Machine Learning', 'Data Science']
          }
        });
      }
      
      authorId = artixUser.id;
    }

    // Extract user IDs from mentions if they're usernames
    let mentionIds = [];
    if (mentions && Array.isArray(mentions)) {
      for (const mention of mentions) {
        if (typeof mention === 'string' && !mention.startsWith('@')) {
          // It's a username, find the user
          const user = await prisma.user.findUnique({
            where: { username: mention },
            select: { id: true }
          });
          if (user) mentionIds.push(user.id);
        } else if (typeof mention === 'string' && mention.length > 0) {
          // Already a user ID
          mentionIds.push(mention);
        }
      }
    }

    const post = await prisma.blogPost.create({
      data: {
        title: title || null,
        content,
        category: category || 'General',
        tags: tags || [],
        coverUrl: coverUrl || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        documents: documents && Array.isArray(documents) ? documents : [],
        mentions: mentionIds,
        authorId: authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Send notifications to mentioned users
    if (mentionIds.length > 0) {
      const { createNotification } = require('./notificationController');
      for (const mentionedUserId of mentionIds) {
        if (mentionedUserId !== userId) {
          await createNotification(
            mentionedUserId,
            'mention',
            'Te mencionaron en un post',
            `${req.user.name || req.user.username} te mencionó en un post`,
            `/blog`
          );
        }
      }
    }

    res.status(201).json({ ok: true, post });
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ ok: false, message: 'Failed to create blog post' });
  }
};

// Update blog post
exports.updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, coverUrl, imageUrl, videoUrl, documents, mentions } = req.body;
    const userId = req.user.id;

    // Check if post exists and user owns it
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Blog post not found' });
    }
    
    const canEdit = canManageContent(existing.authorId, userId, req.user.role);
    if (!canEdit) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    // Process mentions if provided
    let mentionIds = [];
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      for (const mention of mentions) {
        if (typeof mention === 'string' && mention.length > 0) {
          const user = await prisma.user.findUnique({
            where: { username: mention },
            select: { id: true }
          });
          if (user) mentionIds.push(user.id);
        } else if (typeof mention === 'string' && mention.length > 0) {
          mentionIds.push(mention);
        }
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(documents !== undefined && { documents: Array.isArray(documents) ? documents : [] }),
        ...(mentionIds.length > 0 && { mentions: mentionIds }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    res.json({ ok: true, post });
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ ok: false, message: 'Failed to update blog post' });
  }
};

// Archive/Unarchive blog post
exports.archiveBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { archived } = req.body;
    const userId = req.user.id;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Blog post not found' });
    }
    
    const canArchive = canManageContent(existing.authorId, userId, req.user.role);
    if (!canArchive) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: { archived: archived === true },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json({ ok: true, post, message: archived ? 'Post archived' : 'Post unarchived' });
  } catch (error) {
    console.error('Error archiving blog post:', error);
    res.status(500).json({ ok: false, message: 'Failed to archive blog post' });
  }
};

// Delete blog post
exports.deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if post exists and user owns it
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Blog post not found' });
    }
    
    const canDelete = canManageContent(existing.authorId, userId, req.user.role);
    if (!canDelete) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    await prisma.blogPost.delete({ where: { id } });
    res.json({ ok: true, message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete blog post' });
  }
};


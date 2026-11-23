const prisma = require('../prismaClient')
const logger = require('../lib/logger')
const {
  triggerModerationAfterCreate,
  triggerModerationAfterEdit,
} = require('../middleware/moderationMiddleware')
const { sanitizeCreateStatus, sanitizeUpdateStatus } = require('../lib/contentStatus')

// Helper: only author or admin can manage content
const canManageContent = (authorId, userId, userRole) => authorId === userId || userRole === 'ADMIN'

// Get unique categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.blogPost.findMany({
      where: {
        category: { not: null },
        status: 'published',
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })

    const categoryList = categories
      .map(c => c.category)
      .filter(c => c && c.trim() !== '')
      .sort()

    res.json({ ok: true, categories: categoryList })
  } catch (error) {
    logger.error({ err: error }, '[blogController] Error fetching categories')
    res.status(500).json({ ok: false, message: 'Failed to fetch categories' })
  }
}

// Get all blog posts with pagination and filters
exports.getAllBlogPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, author, dateFrom, dateTo } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {}
    // Default: only show published posts. includeArchived=true exposes all statuses (admin/owner use)
    if (!req.query.includeArchived) {
      where.status = 'published'
    }
    if (category) where.category = category
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (req.query.authorId) {
      where.authorId = req.query.authorId
    } else if (author) {
      where.author = {
        OR: [
          { name: { contains: author, mode: 'insensitive' } },
          { username: { contains: author, mode: 'insensitive' } },
        ],
      }
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z')
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
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blogPost.count({ where }),
    ])

    res.json({
      ok: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error({ err: error }, '[blogController] Error fetching blog posts')
    res.status(500).json({ ok: false, message: 'Failed to fetch blog posts' })
  }
}

// Get single blog post
// optionalAuth is applied in the route so req.user may be set for logged-in users
exports.getBlogPost = async (req, res) => {
  try {
    const { id } = req.params
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
    })

    if (!post) {
      return res.status(404).json({ ok: false, message: 'Blog post not found' })
    }

    // Non-published posts visible only to the author or admin
    if (post.status !== 'published') {
      const user = req.user
      const isOwner = user && user.id === post.authorId
      const isAdmin = user && user.role === 'ADMIN'
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ ok: false, message: 'Blog post not found' })
      }
    }

    res.json({ ok: true, post })
  } catch (error) {
    logger.error({ err: error }, '[blogController] Error fetching blog post')
    res.status(500).json({ ok: false, message: 'Failed to fetch blog post' })
  }
}

// Create blog post
exports.createBlogPost = async (req, res) => {
  try {
    const {
      title,
      content,
      status,
      category,
      tags,
      coverUrl,
      imageUrl,
      videoUrl,
      documents,
      mentions,
      publishAsArtixResearch,
    } = req.body
    const userId = req.user.id

    // Only admin users can publish as Artix Research
    let authorId = userId
    if (publishAsArtixResearch && req.user.role === 'ADMIN') {
      // Buscar o crear el usuario Artix Research
      let artixUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'artixresearch' },
            { username: 'artix-research' },
            { name: 'Artix Research' },
          ],
        },
      })

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
            interests: [
              'Quantum Physics',
              'AI Research',
              'Chemistry',
              'Machine Learning',
              'Data Science',
            ],
          },
        })
      }

      authorId = artixUser.id
    }

    // Extract user IDs from mentions if they're usernames
    const mentionIds = []
    if (mentions && Array.isArray(mentions)) {
      for (const mention of mentions) {
        if (typeof mention === 'string' && !mention.startsWith('@')) {
          // It's a username, find the user
          const user = await prisma.user.findUnique({
            where: { username: mention },
            select: { id: true },
          })
          if (user) mentionIds.push(user.id)
        } else if (typeof mention === 'string' && mention.length > 0) {
          // Already a user ID
          mentionIds.push(mention)
        }
      }
    }

    const post = await prisma.blogPost.create({
      data: {
        title: title || null,
        content,
        status: sanitizeCreateStatus(status),
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
    })

    // Send notifications to mentioned users
    if (mentionIds.length > 0) {
      const { createNotification } = require('./notificationController')
      for (const mentionedUserId of mentionIds) {
        if (mentionedUserId !== userId) {
          await createNotification(
            mentionedUserId,
            'mention',
            'Te mencionaron en un post',
            `${req.user.name || req.user.username} te mencionó en un post`,
            `/blog`
          )
        }
      }
    }

    if (post.status === 'reviewing') {
      triggerModerationAfterCreate('blogPost', { id: post.id })
    }

    res.status(201).json({ ok: true, post })
  } catch (error) {
    if (error.code === 'INVALID_STATUS')
      return res.status(400).json({ ok: false, message: error.message })
    logger.error({ err: error }, '[blogController] Error creating blog post')
    res.status(500).json({ ok: false, message: 'Failed to create blog post' })
  }
}

// Update blog post
exports.updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, category, tags, coverUrl, imageUrl, videoUrl, documents, mentions, status } =
      req.body
    const userId = req.user.id

    const safeStatus = sanitizeUpdateStatus(status)

    // Check if post exists and user owns it
    const existing = await prisma.blogPost.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Blog post not found' })
    }

    const canEdit = canManageContent(existing.authorId, userId, req.user.role)
    if (!canEdit) {
      return res.status(403).json({ ok: false, message: 'Not authorized' })
    }

    // Process mentions if provided
    const mentionIds = []
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      for (const mention of mentions) {
        if (typeof mention === 'string' && !mention.startsWith('@') && mention.length > 0) {
          const user = await prisma.user.findUnique({
            where: { username: mention },
            select: { id: true },
          })
          if (user) mentionIds.push(user.id)
        } else if (typeof mention === 'string' && mention.length > 0) {
          mentionIds.push(mention)
        }
      }
    }

    const moderationPatch = triggerModerationAfterEdit('blogPost', existing, { title, content })

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
        ...(safeStatus !== undefined && { status: safeStatus }),
        ...(existing.status === 'rejected' && safeStatus === 'reviewing' && {
          moderationReason: null,
          moderationError:  null,
        }),
        ...moderationPatch,
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
    })

    if ((existing.status === 'draft' || existing.status === 'rejected') && safeStatus === 'reviewing') {
      triggerModerationAfterCreate('blogPost', { id: post.id })
    }

    res.json({ ok: true, post })
  } catch (error) {
    if (error.code === 'INVALID_STATUS')
      return res.status(400).json({ ok: false, message: error.message })
    logger.error({ err: error }, '[blogController] Error updating blog post')
    res.status(500).json({ ok: false, message: 'Failed to update blog post' })
  }
}

// Archive/Unarchive blog post
exports.archiveBlogPost = async (req, res) => {
  try {
    const { id } = req.params
    const { archived } = req.body
    const userId = req.user.id

    const existing = await prisma.blogPost.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Blog post not found' })
    }

    const canArchive = canManageContent(existing.authorId, userId, req.user.role)
    if (!canArchive) {
      return res.status(403).json({ ok: false, message: 'Not authorized' })
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        archived: archived === true,
        status: archived === true ? 'archived' : 'published',
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
    })

    res.json({ ok: true, post, message: archived ? 'Post archived' : 'Post unarchived' })
  } catch (error) {
    logger.error({ err: error }, '[blogController] Error archiving blog post')
    res.status(500).json({ ok: false, message: 'Failed to archive blog post' })
  }
}

// Delete blog post
exports.deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Check if post exists and user owns it
    const existing = await prisma.blogPost.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Blog post not found' })
    }

    const canDelete = canManageContent(existing.authorId, userId, req.user.role)
    if (!canDelete) {
      return res.status(403).json({ ok: false, message: 'Not authorized' })
    }

    await prisma.blogPost.delete({ where: { id } })
    res.json({ ok: true, message: 'Blog post deleted successfully' })
  } catch (error) {
    logger.error({ err: error }, '[blogController] Error deleting blog post')
    res.status(500).json({ ok: false, message: 'Failed to delete blog post' })
  }
}

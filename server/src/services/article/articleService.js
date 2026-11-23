const articleRepository = require('../../repositories/articleRepository')
const {
  getArtixResearchAuthorId,
  canPublishAsArtixResearch,
} = require('../shared/artixResearchService')
const jobQueue = require('../../integrations/queue/jobQueue')
const logger = require('../../lib/logger')
const {
  triggerModerationAfterCreate,
  triggerModerationAfterEdit,
} = require('../../middleware/moderationMiddleware')
const {
  sanitizeCreateStatus,
  sanitizeUpdateStatus,
} = require('../../lib/contentStatus')

jobQueue.register('article:track-read', async ({ userId }) => {
  const { trackArticleRead } = require('../subscription/subscriptionService')
  await trackArticleRead(userId)
})

// ——————————————————————————————————————————
// Authorization helper
// ——————————————————————————————————————————
const assertCanManage = (authorId, currentUser) => {
  if (authorId !== currentUser.id && currentUser.role !== 'ADMIN') {
    const err = new Error('Not authorized')
    err.code = 'UNAUTHORIZED'
    throw err
  }
}

// ——————————————————————————————————————————
// Service functions
// ——————————————————————————————————————————

exports.getAllArticles = async (query, currentUser) => {
  const {
    page = 1,
    limit = 10,
    category,
    status,
    search,
    author,
    tags,
    dateFrom,
    dateTo,
    includeArchived,
    authorId,
  } = query
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const isAdmin = currentUser?.role === 'ADMIN'

  const where = {}
  if (!isAdmin) {
    // Unauthenticated users and non-admins only see published articles
    where.status = 'published'
  } else if (status) {
    where.status = status
  } else if (!includeArchived) {
    where.status = { not: 'archived' }
  }
  if (category) where.category = category
  if (authorId) {
    where.authorId = authorId
  } else if (author) {
    where.author = {
      OR: [
        { name: { contains: author, mode: 'insensitive' } },
        { username: { contains: author, mode: 'insensitive' } },
      ],
    }
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (tags) {
    where.tags = { hasSome: tags.split(',').map(t => t.trim()) }
  }
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z')
  }

  const [articles, total] = await Promise.all([
    articleRepository.findMany({ where, skip, take: parseInt(limit) }),
    articleRepository.count(where),
  ])

  return {
    articles,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  }
}

exports.getArticle = async (id, currentUser) => {
  const article = await articleRepository.findById(id)
  if (!article) {
    const err = new Error('Article not found')
    err.code = 'NOT_FOUND'
    throw err
  }

  const isOwner = currentUser?.id === article.authorId
  const isAdmin = currentUser?.role === 'ADMIN'
  if (article.status !== 'published' && !isOwner && !isAdmin) {
    const err = new Error('Article not found')
    err.code = 'NOT_FOUND'
    throw err
  }

  // Fire-and-forget tracking (non-blocking)
  if (currentUser) {
    jobQueue.enqueue('article:track-read', { userId: currentUser.id })
  }

  return article
}

exports.createArticle = async (body, currentUser) => {
  const {
    title,
    content,
    description,
    category,
    tags,
    status,
    references,
    pdfUrl,
    coverUrl,
    publishAsArtixResearch,
  } = body

  let authorId = currentUser.id
  if (publishAsArtixResearch) {
    if (!canPublishAsArtixResearch(currentUser)) {
      const err = new Error('Not authorized to publish as Artix Research')
      err.code = 'UNAUTHORIZED'
      throw err
    }
    authorId = await getArtixResearchAuthorId()
  }

  const article = await articleRepository.create({
    title,
    content,
    description,
    category,
    tags: tags || [],
    status: sanitizeCreateStatus(status),
    references: references || [],
    pdfUrl,
    coverUrl,
    authorId,
  })

  if (article.status === 'reviewing') {
    triggerModerationAfterCreate('article', {
      id: article.id,
      title: article.title,
      body: article.content,
    })
  }

  return article
}

exports.updateArticle = async (id, body, currentUser) => {
  const existing = await articleRepository.findById(id)
  if (!existing) {
    const err = new Error('Article not found')
    err.code = 'NOT_FOUND'
    throw err
  }
  assertCanManage(existing.authorId, currentUser)

  const { title, content, description, category, tags, status, references, pdfUrl, coverUrl } = body

  const safeStatus = sanitizeUpdateStatus(status)

  // Re-moderate when published content's title or body changes
  const moderationPatch = triggerModerationAfterEdit('article', existing, { title, content })

  return articleRepository.update(id, {
    ...(title !== undefined && { title }),
    ...(content !== undefined && { content }),
    ...(description !== undefined && { description }),
    ...(category !== undefined && { category }),
    ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
    ...(safeStatus !== undefined && { status: safeStatus }),
    ...(references !== undefined && { references: Array.isArray(references) ? references : [] }),
    ...(pdfUrl !== undefined && { pdfUrl }),
    ...(coverUrl !== undefined && { coverUrl }),
    ...moderationPatch,
  })
}

exports.deleteArticle = async (id, currentUser) => {
  const existing = await articleRepository.findById(id)
  if (!existing) {
    const err = new Error('Article not found')
    err.code = 'NOT_FOUND'
    throw err
  }
  assertCanManage(existing.authorId, currentUser)
  await articleRepository.delete(id)
}

exports.setArchived = async (id, archived, currentUser) => {
  const existing = await articleRepository.findById(id)
  if (!existing) {
    const err = new Error('Article not found')
    err.code = 'NOT_FOUND'
    throw err
  }
  assertCanManage(existing.authorId, currentUser)
  return articleRepository.update(id, { status: archived ? 'archived' : 'published' })
}

exports.addComment = async (articleId, content, currentUser) => {
  const prisma = require('../../prismaClient')
  const article = await articleRepository.findById(articleId)
  if (!article) {
    const err = new Error('Article not found')
    err.code = 'NOT_FOUND'
    throw err
  }

  return prisma.comment.create({
    data: { content, authorId: currentUser.id, articleId },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })
}

exports.getCategories = async () => {
  const prisma = require('../../prismaClient')
  const categories = await prisma.article.findMany({
    where: { status: 'published' },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })
  return categories.map(a => a.category).filter(Boolean)
}

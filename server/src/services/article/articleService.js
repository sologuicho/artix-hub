const articleRepository = require('../../repositories/articleRepository');
const { getArtixResearchAuthorId, canPublishAsArtixResearch } = require('../shared/artixResearchService');
const jobQueue = require('../../integrations/queue/jobQueue');

// ——————————————————————————————————————————
// Job handlers — registered once at import time
// ——————————————————————————————————————————
jobQueue.register('article:validate', async ({ articleId }) => {
  const { validateContent } = require('../../lib/ai/aiClient');
  const prisma = require('../../prismaClient');

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { content: true, category: true, title: true, description: true }
  });
  if (!article) return;

  try {
    const validation = await validateContent({
      type: 'article',
      text: article.content,
      metadata: { category: article.category, title: article.title, description: article.description }
    });
    const newStatus = validation.safeToPublish && validation.qualityScore >= 70
      ? 'published'
      : 'draft';
    await prisma.article.update({ where: { id: articleId }, data: { status: newStatus } });
  } catch (err) {
    console.error('[articleService] AI validation failed, falling back to draft:', err.message);
    await prisma.article.update({ where: { id: articleId }, data: { status: 'draft' } });
  }
});

jobQueue.register('article:track-read', async ({ userId }) => {
  const { trackArticleRead } = require('../subscription/subscriptionService');
  await trackArticleRead(userId);
});

// ——————————————————————————————————————————
// Authorization helper
// ——————————————————————————————————————————
const assertCanManage = (authorId, currentUser) => {
  if (authorId !== currentUser.id && currentUser.role !== 'admin') {
    const err = new Error('Not authorized');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
};

// ——————————————————————————————————————————
// Service functions
// ——————————————————————————————————————————

exports.getAllArticles = async (query) => {
  const { page = 1, limit = 10, category, status, search, author, tags, dateFrom, dateTo, includeArchived, authorId } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (!includeArchived && status !== 'archived') where.status = { not: 'archived' };
  if (category) where.category = category;
  if (status) where.status = status;
  if (authorId) {
    where.authorId = authorId;
  } else if (author) {
    where.author = { OR: [
      { name: { contains: author, mode: 'insensitive' } },
      { username: { contains: author, mode: 'insensitive' } }
    ]};
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (tags) {
    where.tags = { hasSome: tags.split(',').map(t => t.trim()) };
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
  }

  const [articles, total] = await Promise.all([
    articleRepository.findMany({ where, skip, take: parseInt(limit) }),
    articleRepository.count(where)
  ]);

  return { articles, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
};

exports.getArticle = async (id, currentUser) => {
  const article = await articleRepository.findById(id);
  if (!article) {
    const err = new Error('Article not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Fire-and-forget tracking (non-blocking)
  if (currentUser) {
    jobQueue.enqueue('article:track-read', { userId: currentUser.id });
  }

  return article;
};

exports.createArticle = async (body, currentUser) => {
  const { title, content, description, category, tags, status, references, pdfUrl, coverUrl, publishAsArtixResearch } = body;

  let authorId = currentUser.id;
  if (publishAsArtixResearch) {
    if (!canPublishAsArtixResearch(currentUser)) {
      const err = new Error('Not authorized to publish as Artix Research');
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    authorId = await getArtixResearchAuthorId();
  }

  const article = await articleRepository.create({
    title, content, description, category,
    tags: tags || [],
    status: status || 'draft',
    references: references || [],
    pdfUrl,
    coverUrl,
    authorId
  });

  if (article.status === 'reviewing') {
    jobQueue.enqueue('article:validate', { articleId: article.id });
  }

  return article;
};

exports.updateArticle = async (id, body, currentUser) => {
  const existing = await articleRepository.findById(id);
  if (!existing) {
    const err = new Error('Article not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertCanManage(existing.authorId, currentUser);

  const { title, content, description, category, tags, status, references, pdfUrl, coverUrl } = body;

  return articleRepository.update(id, {
    ...(title !== undefined && { title }),
    ...(content !== undefined && { content }),
    ...(description !== undefined && { description }),
    ...(category !== undefined && { category }),
    ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
    ...(status !== undefined && { status }),
    ...(references !== undefined && { references: Array.isArray(references) ? references : [] }),
    ...(pdfUrl !== undefined && { pdfUrl }),
    ...(coverUrl !== undefined && { coverUrl })
  });
};

exports.deleteArticle = async (id, currentUser) => {
  const existing = await articleRepository.findById(id);
  if (!existing) {
    const err = new Error('Article not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertCanManage(existing.authorId, currentUser);
  await articleRepository.delete(id);
};

exports.setArchived = async (id, archived, currentUser) => {
  const existing = await articleRepository.findById(id);
  if (!existing) {
    const err = new Error('Article not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertCanManage(existing.authorId, currentUser);
  return articleRepository.update(id, { archived });
};

exports.addComment = async (articleId, content, currentUser) => {
  const prisma = require('../../prismaClient');
  const article = await articleRepository.findById(articleId);
  if (!article) {
    const err = new Error('Article not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  return prisma.comment.create({
    data: { content, authorId: currentUser.id, articleId },
    include: { author: { select: { id: true, name: true, avatar: true } } }
  });
};

exports.getCategories = async () => {
  const prisma = require('../../prismaClient');
  const all = await prisma.article.findMany({
    where: { category: { not: null }, status: { not: 'archived' } },
    select: { category: true }
  });
  return [...new Set(all.map(a => a.category).filter(Boolean))].sort();
};

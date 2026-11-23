'use strict'

/**
 * AI assist endpoints:
 *   POST /api/ai/assist  — SSE streaming chat with content context
 *   POST /api/ai/search  — hybrid semantic search
 *
 * Both are server-side proxies: AI_CORE_KEY never reaches the browser.
 */

const prisma  = require('../prismaClient')
const aiCore  = require('../lib/aiCoreClient')
const logger  = require('../lib/logger')

// ─── Content loaders ─────────────────────────────────────────────────────────

const LOADERS = {
  article: (id) =>
    prisma.article.findUnique({
      where: { id },
      select: { id: true, title: true, content: true, status: true, authorId: true },
    }),

  research: (id) =>
    prisma.research.findUnique({
      where: { id },
      select: { id: true, title: true, content: true, status: true, authorId: true },
    }),

  blogPost: (id) =>
    prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, title: true, content: true, status: true, authorId: true },
    }),

  event: (id) =>
    prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        creatorId: true,
      },
    }),
}

function getBodyText(entity, row) {
  return entity === 'event' ? row.description : row.content
}

function getOwnerId(entity, row) {
  return entity === 'event' ? row.creatorId : row.authorId
}

// ─── POST /api/ai/assist ─────────────────────────────────────────────────────

/**
 * SSE-streaming sidebar assistant.
 * Receives { entity, id, messages } — loads the content from DB, proxies to ai-core.
 */
exports.assist = async (req, res) => {
  const { entity, id, messages } = req.body

  if (!entity || !id || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      ok: false,
      message: 'entity, id, and messages are required',
    })
  }

  const loader = LOADERS[entity]
  if (!loader) {
    return res.status(400).json({ ok: false, message: `Unknown entity: ${entity}` })
  }

  if (!aiCore.isConfigured()) {
    return res.status(503).json({ ok: false, message: 'AI service not available' })
  }

  let row
  try {
    row = await loader(id)
  } catch (err) {
    logger.error({ err, entity, id }, '[aiAssist] DB lookup failed')
    return res.status(500).json({ ok: false, message: 'Failed to load content' })
  }

  if (!row) {
    return res.status(404).json({ ok: false, message: 'Content not found' })
  }

  // Permission check: content must be published OR the requesting user must be the author/admin
  const userId = req.user.id
  const ownerId = getOwnerId(entity, row)
  const isOwner = ownerId === userId
  const isAdmin = req.user.role === 'ADMIN'

  if (row.status !== 'published' && !isOwner && !isAdmin) {
    return res.status(403).json({ ok: false, message: 'Content not available' })
  }

  const context = {
    id:     row.id,
    entity,
    title:  row.title || '',
    body:   getBodyText(entity, row),
  }

  let aiRes
  try {
    aiRes = await aiCore.chatStream({ context, messages })
  } catch (err) {
    logger.error({ err, entity, id }, '[aiAssist] ai-core request failed')
    return res.status(502).json({ ok: false, message: 'AI service error' })
  }

  // Forward SSE stream to client
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    const reader = aiRes.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } catch (err) {
    logger.error({ err }, '[aiAssist] Stream read error')
  } finally {
    res.end()
  }
}

// ─── POST /api/ai/search ─────────────────────────────────────────────────────

/**
 * Hybrid semantic search.
 * Receives { query, entity?, limit? } — proxies to ai-core /v1/search.
 * Only published content is indexed, so results are inherently filtered.
 */
exports.search = async (req, res) => {
  const { query, entity, limit } = req.body

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ ok: false, message: 'query is required' })
  }

  if (!aiCore.isConfigured()) {
    return res.status(503).json({ ok: false, message: 'AI service not available' })
  }

  try {
    const results = await aiCore.search({
      query: query.trim(),
      ...(entity && { entity }),
      ...(limit && { limit: parseInt(limit, 10) }),
    })
    res.json({ ok: true, ...results })
  } catch (err) {
    logger.error({ err }, '[aiSearch] ai-core search failed')
    res.status(502).json({ ok: false, message: 'Search service error' })
  }
}

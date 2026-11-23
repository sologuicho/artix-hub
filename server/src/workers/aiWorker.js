'use strict'

/**
 * Job handlers for AI tasks.
 *
 * Jobs:
 *   ai:moderate  — calls ai-core /v1/moderate, updates content status
 *   ai:index     — calls ai-core /v1/index to add/update a document
 *   ai:delete    — calls ai-core /v1/index/:id to remove a document
 *
 * Retry strategy for ai:moderate: up to MAX_RETRIES attempts with
 * exponential backoff via jobQueue re-enqueue. If all retries fail,
 * content is left in 'reviewing' status (manual review fallback).
 */

const prisma        = require('../lib/prisma')
const jobQueue      = require('../integrations/queue/jobQueue')
const aiCore        = require('../lib/aiCoreClient')
const logger        = require('../lib/logger')

const MAX_RETRIES   = 3
const BASE_DELAY_MS = 2_000 // 2s, 4s, 8s

// ─── Model helpers ───────────────────────────────────────────────────────────

const MODELS = {
  article:  prisma.article,
  research: prisma.research,
  blogPost: prisma.blogPost,
  event:    prisma.event,
}

function getModel(entity) {
  const model = MODELS[entity]
  if (!model) throw new Error(`Unknown entity type for moderation: ${entity}`)
  return model
}

// ─── ai:moderate ─────────────────────────────────────────────────────────────

async function handleModerate({ entity, id, title, body, attempt = 1 }) {
  if (!aiCore.isConfigured()) {
    logger.warn({ entity, id }, '[aiWorker] ai-core not configured — skipping moderation')
    return
  }

  try {
    const result = await aiCore.moderate({
      type:       entity,
      title,
      body,
      content_id: id,
    })

    const { decision, score, reasons } = result

    // Map ai-core decision → Artix Hub status
    const statusMap = {
      approved:     'published',
      needs_review: 'reviewing',
      rejected:     'rejected',
    }
    const newStatus = statusMap[decision] ?? 'reviewing'

    await getModel(entity).update({
      where: { id },
      data: {
        status:          newStatus,
        moderationScore:  score,
        moderationReason: reasons?.length ? reasons.join('; ') : null,
        ...(newStatus === 'published' && entity === 'blogPost' && { archived: false }),
        ...(newStatus === 'published' && entity === 'event'    && { archived: false }),
      },
    })

    // Index the content now that it's published
    if (newStatus === 'published') {
      jobQueue.enqueue('ai:index', { entity, id, title, body })
    }

    logger.info({ entity, id, decision, score }, '[aiWorker] Moderation complete')
  } catch (err) {
    logger.error({ err, entity, id, attempt }, '[aiWorker] Moderation attempt failed')

    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1)
      setTimeout(() => {
        jobQueue.enqueue('ai:moderate', { entity, id, title, body, attempt: attempt + 1 })
      }, delay)
    } else {
      logger.warn({ entity, id }, '[aiWorker] Max retries reached — content stays in reviewing')
    }
  }
}

// ─── ai:index ────────────────────────────────────────────────────────────────

async function handleIndex({ entity, id, title, body, metadata = {} }) {
  if (!aiCore.isConfigured()) return

  // Normalize entity name: blogPost → post to match ai-core entity convention
  const aiEntity = entity === 'blogPost' ? 'post' : entity

  try {
    await aiCore.indexDocument({
      id:       `${aiEntity}-${id}`,
      entity:   aiEntity,
      text:     `${title}\n\n${body}`,
      metadata: { artixId: id, ...metadata },
    })
    logger.info({ entity, id }, '[aiWorker] Document indexed')
  } catch (err) {
    logger.error({ err, entity, id }, '[aiWorker] Index failed (non-fatal)')
  }
}

// ─── ai:delete ───────────────────────────────────────────────────────────────

async function handleDelete({ entity, id }) {
  if (!aiCore.isConfigured()) return

  const aiEntity = entity === 'blogPost' ? 'post' : entity

  try {
    await aiCore.deleteDocument(`${aiEntity}-${id}`)
    logger.info({ entity, id }, '[aiWorker] Document removed from index')
  } catch (err) {
    logger.error({ err, entity, id }, '[aiWorker] Delete from index failed (non-fatal)')
  }
}

// ─── Registration ─────────────────────────────────────────────────────────────

function register() {
  jobQueue.register('ai:moderate', handleModerate)
  jobQueue.register('ai:index',    handleIndex)
  jobQueue.register('ai:delete',   handleDelete)
}

module.exports = { register }

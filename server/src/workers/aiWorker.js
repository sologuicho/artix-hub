'use strict'

/**
 * Job handlers for AI tasks.
 *
 * Jobs:
 *   ai:moderate  — calls ai-core /v1/moderate, updates content status
 *   ai:index     — calls ai-core /v1/index to add/update a document
 *   ai:delete    — calls ai-core /v1/index/:id to remove a document
 *
 * ai:moderate reads the CURRENT content from the DB at execution time.
 * The job payload carries only { entity, id } — no title/body snapshot —
 * so a job that was queued before a subsequent edit always moderates the
 * latest version. Deduplication in jobQueue ensures only one pending job
 * per content item at a time.
 *
 * Retry strategy: up to MAX_RETRIES attempts with exponential backoff.
 * On exhaustion, content stays in 'reviewing' and moderationError is set
 * (admin-only). moderationReason is never touched on retries.
 */

const prisma   = require('../prismaClient')
const jobQueue = require('../integrations/queue/jobQueue')
const aiCore   = require('../lib/aiCoreClient')
const logger   = require('../lib/logger')

const MAX_RETRIES   = 3
const BASE_DELAY_MS = 2_000 // 2s, 4s, 8s

// ─── Model helpers ───────────────────────────────────────────────────────────

const MODELS = {
  article:  prisma.article,
  research: prisma.research,
  blogPost: prisma.blogPost,
  event:    prisma.event,
}

const BODY_FIELD = {
  article:  'content',
  research: 'content',
  blogPost: 'content',
  event:    'description',
}

function getModel(entity) {
  const model = MODELS[entity]
  if (!model) throw new Error(`Unknown entity type for moderation: ${entity}`)
  return model
}

// ─── ai:moderate ─────────────────────────────────────────────────────────────

async function handleModerate({ entity, id, attempt = 1 }) {
  if (!aiCore.isConfigured()) {
    logger.warn({ entity, id }, '[aiWorker] ai-core not configured — skipping moderation')
    return
  }

  try {
    // Always read from DB so we moderate the current content, not a stale snapshot
    const record = await getModel(entity).findUnique({ where: { id } })
    if (!record) {
      logger.warn({ entity, id }, '[aiWorker] Record not found — skipping moderation')
      return
    }

    const title = record.title ?? ''
    const body  = record[BODY_FIELD[entity]] ?? ''

    const result = await aiCore.moderate({
      type:       entity,
      title,
      body,
      content_id: id,
    })

    const { decision, score, reasons } = result

    const statusMap = {
      approved:     'published',
      needs_review: 'reviewing',
      rejected:     'rejected',
    }
    const newStatus = statusMap[decision] ?? 'reviewing'

    await getModel(entity).update({
      where: { id },
      data: {
        status:           newStatus,
        moderationScore:  score,
        moderationReason: newStatus === 'rejected' && reasons?.length ? reasons.join('; ') : null,
        moderationError:  null,
        ...(newStatus === 'published' && entity === 'blogPost' && { archived: false }),
        ...(newStatus === 'published' && entity === 'event'    && { archived: false }),
      },
    })

    if (newStatus === 'published') {
      jobQueue.enqueue('ai:index', { entity, id, title, body })
    }

    logger.info({ entity, id, decision, score }, '[aiWorker] Moderation complete')
  } catch (err) {
    logger.error({ err, entity, id, attempt }, '[aiWorker] Moderation attempt failed')

    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1)
      setTimeout(() => {
        jobQueue.enqueue(
          'ai:moderate',
          { entity, id, attempt: attempt + 1 },
          { jobId: `${entity}:${id}` }
        )
      }, delay)
    } else {
      logger.warn({ entity, id }, '[aiWorker] Max retries reached — content stays in reviewing')
      try {
        await getModel(entity).update({
          where: { id },
          data: {
            moderationError: `ai:moderate failed after ${MAX_RETRIES} attempts: ${err.message}`,
          },
        })
      } catch (dbErr) {
        logger.error({ dbErr, entity, id }, '[aiWorker] Failed to persist moderationError')
      }
    }
  }
}

// ─── ai:index ────────────────────────────────────────────────────────────────

async function handleIndex({ entity, id, title, body, metadata = {} }) {
  if (!aiCore.isConfigured()) return

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

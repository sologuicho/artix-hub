'use strict'

/**
 * Shared helpers for triggering ai-core moderation from controllers/services.
 *
 * Not an Express middleware per se — a module with two callable helpers:
 *   triggerModerationAfterCreate  — enqueue ai:moderate for brand-new content
 *   triggerModerationAfterEdit    — enqueue ai:moderate when published content is edited
 *
 * The job payload intentionally carries ONLY { entity, id }. The worker reads
 * the current content from the DB at execution time so stale snapshots never
 * reach ai-core. Deduplication is handled by jobQueue via jobId = `${entity}:${id}`.
 */

const jobQueue = require('../integrations/queue/jobQueue')
const logger   = require('../lib/logger')

// Field that holds the "body" text for each entity type — used for change detection only
const BODY_FIELD = {
  article:  'content',
  research: 'content',
  blogPost: 'content',
  event:    'description',
}

/**
 * Call after successfully creating new content.
 * Enqueues ai:moderate so the worker sets the final status.
 *
 * @param {'article'|'research'|'blogPost'|'event'} entity
 * @param {{ id: string }} content
 */
function triggerModerationAfterCreate(entity, { id }) {
  jobQueue.enqueue('ai:moderate', { entity, id }, { jobId: `${entity}:${id}` })
  logger.info({ entity, id }, '[moderation] Queued ai:moderate after create')
}

/**
 * Call before updating content.
 * Sets status back to 'reviewing' via the returned patch and enqueues ai:moderate
 * only when title or body actually changed on a published item.
 *
 * Returns a Prisma data patch `{ status: 'reviewing' }` to merge into the update
 * call, or `{}` when no re-moderation is needed (so it's safe to spread).
 *
 * @param {'article'|'research'|'blogPost'|'event'} entity
 * @param {object} existing  — the row fetched before the update
 * @param {object} incoming  — req.body / update payload
 * @returns {{ status?: string }} patch to merge into the Prisma update data
 */
function triggerModerationAfterEdit(entity, existing, incoming) {
  if (existing.status !== 'published') return {}

  const bodyField    = BODY_FIELD[entity]
  const titleChanged = incoming.title !== undefined && incoming.title !== existing.title
  const bodyChanged  = incoming[bodyField] !== undefined && incoming[bodyField] !== existing[bodyField]

  if (!titleChanged && !bodyChanged) return {}

  // Schedule moderation — runs after the caller's DB update completes.
  // Worker reads the saved content from DB, so we only need { entity, id }.
  setImmediate(() => {
    jobQueue.enqueue('ai:moderate', { entity, id: existing.id }, { jobId: `${entity}:${existing.id}` })
    logger.info({ entity, id: existing.id }, '[moderation] Queued ai:moderate after edit')
  })

  return { status: 'reviewing' }
}

module.exports = { triggerModerationAfterCreate, triggerModerationAfterEdit }

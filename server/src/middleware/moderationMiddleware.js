'use strict'

/**
 * Shared helpers for triggering ai-core moderation from controllers/services.
 *
 * Not an Express middleware per se — a module with two callable helpers:
 *   triggerModerationAfterCreate  — enqueue ai:moderate for brand-new content
 *   triggerModerationAfterEdit    — enqueue ai:moderate when published content is edited
 */

const jobQueue = require('../integrations/queue/jobQueue')
const logger   = require('../lib/logger')

// Field that holds the "body" text for each entity type
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
 * @param {{ id: string, title: string, body: string }} content
 */
function triggerModerationAfterCreate(entity, { id, title, body }) {
  jobQueue.enqueue('ai:moderate', { entity, id, title, body })
  logger.info({ entity, id }, '[moderation] Queued ai:moderate after create')
}

/**
 * Call after successfully updating published content.
 * Sets status back to 'reviewing' via the returned patch and enqueues ai:moderate
 * only when title or body actually changed.
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

  const bodyField   = BODY_FIELD[entity]
  const titleChanged = incoming.title !== undefined && incoming.title !== existing.title
  const bodyChanged  = incoming[bodyField] !== undefined && incoming[bodyField] !== existing[bodyField]

  if (!titleChanged && !bodyChanged) return {}

  const title = incoming.title    ?? existing.title
  const body  = incoming[bodyField] ?? existing[bodyField]

  // Schedule moderation — runs after the caller's DB update completes
  setImmediate(() => {
    jobQueue.enqueue('ai:moderate', { entity, id: existing.id, title, body })
    logger.info({ entity, id: existing.id }, '[moderation] Queued ai:moderate after edit')
  })

  // Caller must include this patch so the content goes back to reviewing
  return { status: 'reviewing' }
}

module.exports = { triggerModerationAfterCreate, triggerModerationAfterEdit }

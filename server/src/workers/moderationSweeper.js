'use strict'

/**
 * moderationSweeper — recovery net for lost AI jobs.
 *
 * In-process queues (setImmediate) lose all pending jobs on restart/redeploy.
 * This sweeper runs every 5 minutes and handles three phases:
 *
 *   sweepModeration — re-enqueues content stuck in 'reviewing' > 10 min.
 *                     Skips items whose moderationError was set < 30 min ago
 *                     so a down ai-core doesn't get hammered every sweep.
 *
 *   sweepIndex      — enqueues ai:index for published content where
 *                     indexedAt IS NULL or indexedAt < updatedAt (stale).
 *
 *   sweepDeindex    — enqueues ai:delete for non-published content that
 *                     still has indexedAt set (was indexed but then removed).
 *
 * Usage: call start() once at server boot (after aiWorker.register()).
 */

const prisma    = require('../prismaClient')
const jobQueue  = require('../integrations/queue/jobQueue')
const logger    = require('../lib/logger')

const STALE_MS            = 10 * 60 * 1000  // items stuck > 10 min are eligible
const RECENT_FAILURE_MS   = 30 * 60 * 1000  // skip items whose error is < 30 min old
const SWEEP_INTERVAL_MS   = 5 * 60 * 1000   // run every 5 minutes
const FIRST_RUN_DELAY_MS  = 60 * 1000       // first run 1 min after server boot

// DB table name must match Prisma schema model names (PascalCase)
const ENTITIES = [
  { name: 'article',  model: () => prisma.article,  table: 'Article'  },
  { name: 'research', model: () => prisma.research,  table: 'Research' },
  { name: 'blogPost', model: () => prisma.blogPost,  table: 'BlogPost' },
  { name: 'event',    model: () => prisma.event,     table: 'Event'    },
]

// ─── Phase 1: re-enqueue stuck moderation ────────────────────────────────────

async function sweepModeration() {
  const cutoff          = new Date(Date.now() - STALE_MS)
  const recentFailureCutoff = new Date(Date.now() - RECENT_FAILURE_MS)
  let total = 0

  for (const { name, model } of ENTITIES) {
    try {
      const stuck = await model().findMany({
        where: {
          status:          'reviewing',
          moderationScore: null,
          updatedAt:       { lt: cutoff },
          // Skip items with a recent moderationError (ai-core likely still down)
          OR: [
            { moderationError: null },
            { updatedAt: { lte: recentFailureCutoff } },
          ],
        },
        select: { id: true },
      })

      for (const { id } of stuck) {
        jobQueue.enqueue('ai:moderate', { entity: name, id }, { jobId: `${name}:${id}` })
        total++
      }

      if (stuck.length > 0) {
        logger.info({ entity: name, count: stuck.length }, '[moderationSweeper] Re-enqueued stuck items')
      }
    } catch (err) {
      logger.error({ err, entity: name }, '[moderationSweeper] Error scanning entity (moderation)')
    }
  }

  return total
}

// ─── Phase 2: index published content missing from search index ───────────────

async function sweepIndex() {
  let total = 0

  for (const { name, model, table } of ENTITIES) {
    try {
      // Items that have never been indexed
      const unindexed = await model().findMany({
        where: { status: 'published', indexedAt: null },
        select: { id: true },
      })

      // Items whose index entry is stale (indexedAt < contentUpdatedAt).
      // contentUpdatedAt only advances when indexable fields change — unlike
      // updatedAt (@updatedAt), which also bumps on the same write that sets
      // indexedAt, which would cause infinite re-indexing.
      // Prisma doesn't support column-to-column comparisons natively.
      const staleRows = await prisma.$queryRawUnsafe(
        `SELECT id FROM "${table}" WHERE status = 'published' AND "indexedAt" IS NOT NULL AND "indexedAt" < "contentUpdatedAt"`
      )

      const ids = new Set([
        ...unindexed.map(r => r.id),
        ...staleRows.map(r => r.id),
      ])

      for (const id of ids) {
        jobQueue.enqueue('ai:index', { entity: name, id }, { jobId: `index:${name}:${id}` })
        total++
      }

      if (ids.size > 0) {
        logger.info({ entity: name, count: ids.size }, '[moderationSweeper] Queued for (re-)indexing')
      }
    } catch (err) {
      logger.error({ err, entity: name }, '[moderationSweeper] Error scanning entity (index)')
    }
  }

  return total
}

// ─── Phase 3: deindex content that is no longer published ────────────────────

async function sweepDeindex() {
  let total = 0

  for (const { name, model } of ENTITIES) {
    try {
      const toDeindex = await model().findMany({
        where: {
          status:    { not: 'published' },
          indexedAt: { not: null },
        },
        select: { id: true },
      })

      for (const { id } of toDeindex) {
        jobQueue.enqueue('ai:delete', { entity: name, id }, { jobId: `delete:${name}:${id}` })
        total++
      }

      if (toDeindex.length > 0) {
        logger.info({ entity: name, count: toDeindex.length }, '[moderationSweeper] Queued for deindex')
      }
    } catch (err) {
      logger.error({ err, entity: name }, '[moderationSweeper] Error scanning entity (deindex)')
    }
  }

  return total
}

// ─── Full sweep ───────────────────────────────────────────────────────────────

async function sweep() {
  const [moderation, index, deindex] = await Promise.all([
    sweepModeration(),
    sweepIndex(),
    sweepDeindex(),
  ])

  if (moderation + index + deindex > 0) {
    logger.info({ moderation, index, deindex }, '[moderationSweeper] Sweep complete')
  }

  return { moderation, index, deindex }
}

function start() {
  setTimeout(sweep, FIRST_RUN_DELAY_MS)
  setInterval(sweep, SWEEP_INTERVAL_MS)
  logger.info(
    { firstRunMs: FIRST_RUN_DELAY_MS, intervalMs: SWEEP_INTERVAL_MS },
    '[moderationSweeper] Started'
  )
}

module.exports = { sweep, sweepModeration, sweepIndex, sweepDeindex, start }

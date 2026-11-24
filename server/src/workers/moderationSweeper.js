'use strict'

/**
 * moderationSweeper — recovery net for lost moderation jobs.
 *
 * In-process queues (setImmediate) lose all pending jobs on restart/redeploy.
 * This sweeper runs every 5 minutes and re-enqueues content that is still in
 * 'reviewing' with no moderationScore after more than 10 minutes — meaning
 * its original job was never executed or failed all retries silently.
 *
 * Deduplication in jobQueue ensures that if the job is somehow already running
 * the second enqueue is a no-op.
 *
 * Usage: call start() once at server boot (after aiWorker.register()).
 */

const prisma    = require('../prismaClient')
const jobQueue  = require('../integrations/queue/jobQueue')
const logger    = require('../lib/logger')

const STALE_MS         = 10 * 60 * 1000  // items stuck > 10 min are eligible
const SWEEP_INTERVAL_MS = 5 * 60 * 1000  // run every 5 minutes
const FIRST_RUN_DELAY_MS = 60 * 1000     // first run 1 min after server boot

const ENTITIES = [
  { name: 'article',  model: () => prisma.article },
  { name: 'research', model: () => prisma.research },
  { name: 'blogPost', model: () => prisma.blogPost },
  { name: 'event',    model: () => prisma.event },
]

async function sweep() {
  const cutoff = new Date(Date.now() - STALE_MS)
  let total = 0

  for (const { name, model } of ENTITIES) {
    try {
      const stuck = await model().findMany({
        where: {
          status:          'reviewing',
          moderationScore: null,
          updatedAt:       { lt: cutoff },
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
      logger.error({ err, entity: name }, '[moderationSweeper] Error scanning entity')
    }
  }

  if (total > 0) {
    logger.info({ total }, '[moderationSweeper] Sweep complete')
  }

  return total
}

function start() {
  setTimeout(sweep, FIRST_RUN_DELAY_MS)
  setInterval(sweep, SWEEP_INTERVAL_MS)
  logger.info(
    { firstRunMs: FIRST_RUN_DELAY_MS, intervalMs: SWEEP_INTERVAL_MS },
    '[moderationSweeper] Started'
  )
}

module.exports = { sweep, start }

/**
 * jobQueue — lightweight in-process job queue with deduplication.
 *
 * Uses setImmediate instead of setTimeout for fire-and-forget tasks so
 * the current request cycle completes before the job runs. Errors are
 * logged and isolated — a failing job never crashes the main process.
 *
 * Deduplication: pass { jobId } as the third argument to enqueue. If a job
 * with the same jobId is already pending execution, the new call is a no-op.
 * The pending entry is cleared when the job starts (not when it finishes),
 * so a re-enqueue during execution is accepted and runs next tick.
 *
 * Upgrade path: swap `setImmediate` for BullMQ when Redis is available.
 *
 * Usage:
 *   jobQueue.enqueue('ai:moderate', { entity, id }, { jobId: `${entity}:${id}` })
 */

const logger = require('../../lib/logger')

const handlers = {}
const pending  = new Set()

/**
 * Register a job handler.
 * @param {string} jobName
 * @param {(data: any) => Promise<void>} handler
 */
const register = (jobName, handler) => {
  handlers[jobName] = handler
}

/**
 * Enqueue a job to run asynchronously after the current event-loop tick.
 * @param {string} jobName
 * @param {object} data
 * @param {{ jobId?: string }} [opts]
 */
const enqueue = (jobName, data, { jobId } = {}) => {
  if (jobId) {
    if (pending.has(jobId)) {
      logger.info({ jobName, jobId }, '[JobQueue] Duplicate job skipped')
      return
    }
    pending.add(jobId)
  }

  setImmediate(async () => {
    if (jobId) pending.delete(jobId)
    const handler = handlers[jobName]
    if (!handler) {
      logger.warn({ jobName }, '[JobQueue] No handler registered for job')
      return
    }
    try {
      await handler(data)
    } catch (err) {
      logger.error({ err, jobName }, '[JobQueue] Job failed')
    }
  })
}

module.exports = { register, enqueue }

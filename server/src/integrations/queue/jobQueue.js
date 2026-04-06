/**
 * jobQueue — lightweight in-process job queue.
 *
 * Uses setImmediate instead of setTimeout for fire-and-forget tasks so
 * the current request cycle completes before the job runs. Errors are
 * logged and isolated — a failing job never crashes the main process.
 *
 * Upgrade path: swap `setImmediate` for BullMQ when Redis is available.
 *
 * Usage:
 *   const jobQueue = require('../integrations/queue/jobQueue');
 *   await jobQueue.enqueue('article:validate', { articleId });
 */

const handlers = {};

/**
 * Register a job handler.
 * @param {string} jobName
 * @param {(data: any) => Promise<void>} handler
 */
const register = (jobName, handler) => {
  handlers[jobName] = handler;
};

/**
 * Enqueue a job to run asynchronously after the current event-loop tick.
 * @param {string} jobName
 * @param {object} data
 */
const enqueue = (jobName, data) => {
  setImmediate(async () => {
    const handler = handlers[jobName];
    if (!handler) {
      console.warn(`[JobQueue] No handler registered for job: ${jobName}`);
      return;
    }
    try {
      await handler(data);
    } catch (err) {
      console.error(`[JobQueue] Job "${jobName}" failed:`, err);
    }
  });
};

module.exports = { register, enqueue };

'use strict'

/**
 * Status values a client is allowed to submit.
 * 'published', 'rejected', 'archived' are set only by:
 *   - The AI moderation worker (ai:moderate)
 *   - An admin via PATCH /api/admin/content/:type/:id/status
 *   - Dedicated archive endpoints (POST /:id/archive)
 */
const CLIENT_ALLOWED = new Set(['draft', 'reviewing'])
const SYSTEM_ONLY    = new Set(['published', 'rejected', 'archived'])

/**
 * Validate and return a safe status for a CREATE operation.
 *
 * - undefined / null       → 'reviewing'  (default: submit for review)
 * - 'draft' | 'reviewing'  → passed through
 * - anything else          → throws 400
 *
 * @param {string|undefined} value
 * @returns {string}
 */
function sanitizeCreateStatus(value) {
  if (value === undefined || value === null || value === '') return 'reviewing'
  if (CLIENT_ALLOWED.has(value)) return value
  const hint = SYSTEM_ONLY.has(value)
    ? `'${value}' is set by the moderation system, not by clients.`
    : `Unknown status '${value}'.`
  const err = new Error(`Invalid status: ${hint} Allowed: draft, reviewing.`)
  err.code = 'INVALID_STATUS'
  err.httpStatus = 400
  throw err
}

/**
 * Validate and return a safe status for an UPDATE operation.
 *
 * - undefined / null       → undefined (no change)
 * - 'draft' | 'reviewing'  → passed through
 * - anything else          → throws 400
 *
 * @param {string|undefined} value
 * @returns {string|undefined}
 */
function sanitizeUpdateStatus(value) {
  if (value === undefined || value === null || value === '') return undefined
  if (CLIENT_ALLOWED.has(value)) return value
  const hint = SYSTEM_ONLY.has(value)
    ? `'${value}' is set by the moderation system, not by clients.`
    : `Unknown status '${value}'.`
  const err = new Error(`Invalid status: ${hint} Allowed: draft, reviewing.`)
  err.code = 'INVALID_STATUS'
  err.httpStatus = 400
  throw err
}

module.exports = { sanitizeCreateStatus, sanitizeUpdateStatus, CLIENT_ALLOWED }

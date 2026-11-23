'use strict'

/**
 * HTTP client for the ai-core microservice.
 *
 * All calls use a 20-second timeout and do NOT retry internally.
 * Retry logic lives in aiWorker.js (the job queue handler).
 *
 * Required env vars:
 *   AI_CORE_URL  — base URL of ai-core (e.g. https://ai-core.example.com)
 *   AI_CORE_KEY  — X-API-Key value; never exposed to the browser
 */

const logger = require('./logger')

const BASE_URL = process.env.AI_CORE_URL
const API_KEY  = process.env.AI_CORE_KEY
const TIMEOUT_MS = 20_000

function isConfigured() {
  return Boolean(BASE_URL && API_KEY)
}

async function _post(path, body) {
  if (!isConfigured()) {
    throw new Error('ai-core not configured: AI_CORE_URL or AI_CORE_KEY missing')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`ai-core ${path} responded ${res.status}: ${text}`)
    }

    return res
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Moderate a piece of content.
 * @param {{ type: string, title: string, body: string, content_id: string }} payload
 * @returns {Promise<{ decision: 'approved'|'needs_review'|'rejected', score: number, reasons: string[] }>}
 */
async function moderate(payload) {
  const res = await _post('/v1/moderate', payload)
  return res.json()
}

/**
 * Index a document (fire-and-forget friendly — call from worker).
 * @param {{ id: string, entity: string, text: string, metadata?: object }} payload
 */
async function indexDocument(payload) {
  const res = await _post('/v1/index', payload)
  return res.json()
}

/**
 * Delete a document from the index.
 * @param {string} docId
 */
async function deleteDocument(docId) {
  if (!isConfigured()) {
    throw new Error('ai-core not configured: AI_CORE_URL or AI_CORE_KEY missing')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE_URL}/v1/index/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': API_KEY },
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`ai-core DELETE /v1/index/${docId} responded ${res.status}: ${text}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Hybrid search (vectorial + full-text).
 * @param {{ query: string, entity?: string, limit?: number }} payload
 * @returns {Promise<{ results: object[], total: number, query: string }>}
 */
async function search(payload) {
  const res = await _post('/v1/search', payload)
  return res.json()
}

/**
 * Chat with SSE streaming. Returns the raw Response so callers can pipe it.
 * The caller is responsible for forwarding the stream to the browser.
 * @param {{ context: object, messages: object[], action?: string }} payload
 * @returns {Promise<Response>}
 */
async function chatStream(payload) {
  return _post('/v1/chat', payload)
}

module.exports = { isConfigured, moderate, indexDocument, deleteDocument, search, chatStream }

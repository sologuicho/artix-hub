'use strict'

/**
 * contentUpdatedAtPatch — returns { contentUpdatedAt: now } when any indexable
 * field is present in the incoming update payload, otherwise returns {}.
 *
 * Spread this into the Prisma update data object so contentUpdatedAt advances
 * only when search-relevant content changes, NOT on every save (which would
 * cause indexedAt < contentUpdatedAt to be true forever because @updatedAt
 * bumps on the same write that sets indexedAt).
 */

const INDEXABLE_FIELDS = {
  article:  ['title', 'content', 'description', 'category', 'tags'],
  research: ['title', 'content', 'description', 'category', 'tags'],
  blogPost: ['title', 'content', 'category', 'tags'],
  event:    ['title', 'description', 'type', 'tags'],
}

function contentUpdatedAtPatch(entity, incoming) {
  const fields = INDEXABLE_FIELDS[entity] ?? []
  const changed = fields.some(f => f in incoming && incoming[f] !== undefined)
  return changed ? { contentUpdatedAt: new Date() } : {}
}

module.exports = { contentUpdatedAtPatch, INDEXABLE_FIELDS }

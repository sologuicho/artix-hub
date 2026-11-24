-- Migration: add indexedAt to content tables and User for ai-core index state tracking
-- Safe: ADD COLUMN only (no drops, no renames).
-- indexedAt = NULL means the document has never been indexed (or was deindexed).
-- indexedAt < updatedAt means the index entry is stale and needs a refresh.

-- ─── Article ──────────────────────────────────────────────────────────────────
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "indexedAt" TIMESTAMP(3);

-- ─── Research ─────────────────────────────────────────────────────────────────
ALTER TABLE "Research" ADD COLUMN IF NOT EXISTS "indexedAt" TIMESTAMP(3);

-- ─── BlogPost ─────────────────────────────────────────────────────────────────
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "indexedAt" TIMESTAMP(3);

-- ─── Event ────────────────────────────────────────────────────────────────────
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "indexedAt" TIMESTAMP(3);

-- ─── User ─────────────────────────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "indexedAt" TIMESTAMP(3);

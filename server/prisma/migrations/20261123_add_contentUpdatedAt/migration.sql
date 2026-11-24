-- Migration: add contentUpdatedAt to content tables
-- Safe: ADD COLUMN only (no drops, no renames).
--
-- contentUpdatedAt advances only when indexable fields (title, body, tags, etc.)
-- change. The sweeper compares indexedAt < contentUpdatedAt to detect stale
-- index entries. Using updatedAt caused an infinite loop because @updatedAt also
-- bumps on the write that sets indexedAt.
--
-- Existing rows are initialized to their current updatedAt value so the sweeper
-- does not immediately re-index everything after the migration.

-- ─── Article ──────────────────────────────────────────────────────────────────
ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
UPDATE "Article" SET "contentUpdatedAt" = "updatedAt";

-- ─── Research ─────────────────────────────────────────────────────────────────
ALTER TABLE "Research"
  ADD COLUMN IF NOT EXISTS "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
UPDATE "Research" SET "contentUpdatedAt" = "updatedAt";

-- ─── BlogPost ─────────────────────────────────────────────────────────────────
ALTER TABLE "BlogPost"
  ADD COLUMN IF NOT EXISTS "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
UPDATE "BlogPost" SET "contentUpdatedAt" = "updatedAt";

-- ─── Event ────────────────────────────────────────────────────────────────────
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
UPDATE "Event" SET "contentUpdatedAt" = "updatedAt";

-- Migration: add AI moderation fields to all 4 content types
-- Safe: ADD COLUMN only (no drops, no renames).

-- ─── Article ─────────────────────────────────────────────────────────────────
ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS "moderationScore"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;

-- New articles go through review before publishing
ALTER TABLE "Article" ALTER COLUMN "status" SET DEFAULT 'reviewing';

-- ─── Research ────────────────────────────────────────────────────────────────
ALTER TABLE "Research"
  ADD COLUMN IF NOT EXISTS "moderationScore"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;

ALTER TABLE "Research" ALTER COLUMN "status" SET DEFAULT 'reviewing';

-- ─── BlogPost ────────────────────────────────────────────────────────────────
-- Add status column; default 'reviewing' applies to all new rows.
ALTER TABLE "BlogPost"
  ADD COLUMN IF NOT EXISTS "status"           VARCHAR(50) NOT NULL DEFAULT 'reviewing',
  ADD COLUMN IF NOT EXISTS "moderationScore"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;

-- Existing posts: map archived boolean → status.
-- archived = true  → 'archived'
-- archived = false → 'published'  (they were already live before this migration)
UPDATE "BlogPost"
  SET "status" = CASE WHEN "archived" THEN 'archived' ELSE 'published' END
  WHERE "status" = 'reviewing';

-- ─── Event ───────────────────────────────────────────────────────────────────
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "status"           VARCHAR(50) NOT NULL DEFAULT 'reviewing',
  ADD COLUMN IF NOT EXISTS "moderationScore"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;

UPDATE "Event"
  SET "status" = CASE WHEN "archived" THEN 'archived' ELSE 'published' END
  WHERE "status" = 'reviewing';

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "BlogPost_status_idx" ON "BlogPost"("status");
CREATE INDEX IF NOT EXISTS "Event_status_idx"    ON "Event"("status");

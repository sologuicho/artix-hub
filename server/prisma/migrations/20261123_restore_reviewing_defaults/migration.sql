-- Restore status defaults to 'reviewing' for all 4 content tables.
--
-- Context: while main was in production (without the moderation flow), BlogPost
-- and Event were temporarily set to DEFAULT 'published', and Article to DEFAULT
-- 'draft', so the main-branch code continued to work correctly. Now that
-- feature/ai-core (with sanitizeCreateStatus) is live, every create call passes
-- an explicit status, so the DB default is only a fallback — 'reviewing' is the
-- safe fallback for all content types.

ALTER TABLE "Article"  ALTER COLUMN "status" SET DEFAULT 'reviewing';
ALTER TABLE "Research" ALTER COLUMN "status" SET DEFAULT 'reviewing';
ALTER TABLE "BlogPost" ALTER COLUMN "status" SET DEFAULT 'reviewing';
ALTER TABLE "Event"    ALTER COLUMN "status" SET DEFAULT 'reviewing';

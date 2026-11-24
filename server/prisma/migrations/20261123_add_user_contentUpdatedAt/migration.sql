-- Add contentUpdatedAt to User so sweeper can detect stale index entries
-- without being misled by @updatedAt bumping on the same write that sets indexedAt.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

-- Back-fill: treat current updatedAt as the last time indexable content changed
UPDATE "User" SET "contentUpdatedAt" = "updatedAt";

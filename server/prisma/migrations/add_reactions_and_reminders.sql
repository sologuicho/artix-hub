-- Add reactions table
CREATE TABLE IF NOT EXISTS "Reaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "articleId" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- Add event reminders table
CREATE TABLE IF NOT EXISTS "EventReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Reaction_userId_idx" ON "Reaction"("userId");
CREATE INDEX IF NOT EXISTS "Reaction_postId_idx" ON "Reaction"("postId");
CREATE INDEX IF NOT EXISTS "Reaction_articleId_idx" ON "Reaction"("articleId");
CREATE INDEX IF NOT EXISTS "EventReminder_userId_idx" ON "EventReminder"("userId");
CREATE INDEX IF NOT EXISTS "EventReminder_eventId_idx" ON "EventReminder"("eventId");
CREATE INDEX IF NOT EXISTS "EventReminder_scheduledFor_idx" ON "EventReminder"("scheduledFor");

-- Add foreign keys
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint for user reactions
CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_userId_postId_type_key" ON "Reaction"("userId", "postId", "type") WHERE "postId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_userId_articleId_type_key" ON "Reaction"("userId", "articleId", "type") WHERE "articleId" IS NOT NULL;







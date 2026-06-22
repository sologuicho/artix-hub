-- CreateTable
CREATE TABLE "Repost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT,
    "researchId" TEXT,
    "postId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repost_userId_articleId_key" ON "Repost"("userId", "articleId");
CREATE UNIQUE INDEX "Repost_userId_researchId_key" ON "Repost"("userId", "researchId");
CREATE UNIQUE INDEX "Repost_userId_postId_key" ON "Repost"("userId", "postId");
CREATE UNIQUE INDEX "Repost_userId_eventId_key" ON "Repost"("userId", "eventId");
CREATE INDEX "Repost_userId_idx" ON "Repost"("userId");
CREATE INDEX "Repost_articleId_idx" ON "Repost"("articleId");
CREATE INDEX "Repost_researchId_idx" ON "Repost"("researchId");
CREATE INDEX "Repost_postId_idx" ON "Repost"("postId");
CREATE INDEX "Repost_eventId_idx" ON "Repost"("eventId");

-- AddForeignKey
ALTER TABLE "Repost" ADD CONSTRAINT "Repost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Repost" ADD CONSTRAINT "Repost_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Repost" ADD CONSTRAINT "Repost_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Repost" ADD CONSTRAINT "Repost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Repost" ADD CONSTRAINT "Repost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

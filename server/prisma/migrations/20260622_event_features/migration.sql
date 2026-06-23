-- AlterTable Event
ALTER TABLE "Event" ADD COLUMN "maxAttendees" INTEGER;
ALTER TABLE "Event" ADD COLUMN "ticketPrice" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN "ticketCurrency" TEXT DEFAULT 'MXN';
ALTER TABLE "Event" ADD COLUMN "streamUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "isLive" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable EventWaitlist
CREATE TABLE "EventWaitlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventWaitlist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EventWaitlist_userId_eventId_key" ON "EventWaitlist"("userId", "eventId");
CREATE INDEX "EventWaitlist_eventId_idx" ON "EventWaitlist"("eventId");
CREATE INDEX "EventWaitlist_userId_idx" ON "EventWaitlist"("userId");
ALTER TABLE "EventWaitlist" ADD CONSTRAINT "EventWaitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventWaitlist" ADD CONSTRAINT "EventWaitlist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable EventLobbyMessage
CREATE TABLE "EventLobbyMessage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventLobbyMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EventLobbyMessage_eventId_idx" ON "EventLobbyMessage"("eventId");
CREATE INDEX "EventLobbyMessage_createdAt_idx" ON "EventLobbyMessage"("createdAt");
ALTER TABLE "EventLobbyMessage" ADD CONSTRAINT "EventLobbyMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventLobbyMessage" ADD CONSTRAINT "EventLobbyMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for isLive
CREATE INDEX "Event_isLive_idx" ON "Event"("isLive");

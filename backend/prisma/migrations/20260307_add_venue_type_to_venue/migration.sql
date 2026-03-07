-- Add venueType column to Venue table (US 3.2)
ALTER TABLE "Venue" ADD COLUMN "venueType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Venue" ALTER COLUMN "venueType" DROP DEFAULT;

-- Unique constraint: one entry per (event, external place, venue type)
CREATE UNIQUE INDEX "Venue_eventId_externalId_venueType_key" ON "Venue"("eventId", "externalId", "venueType");

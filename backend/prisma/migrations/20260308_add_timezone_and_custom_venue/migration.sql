-- AlterTable: add timezone (required, defaulting existing rows to UTC)
ALTER TABLE "Event" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- AlterTable: add custom venue fields for finalization
ALTER TABLE "Event" ADD COLUMN "finalVenueName" TEXT;
ALTER TABLE "Event" ADD COLUMN "finalVenueAddress" TEXT;

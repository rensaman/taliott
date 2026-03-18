-- Add lang field to Event for email localization
ALTER TABLE "Event" ADD COLUMN "lang" TEXT NOT NULL DEFAULT 'en';

-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('walking', 'cycling', 'driving', 'transit');

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "travelMode" "TravelMode" NOT NULL DEFAULT 'transit';

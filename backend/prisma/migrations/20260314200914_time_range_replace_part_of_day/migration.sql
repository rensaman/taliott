/*
  Warnings:

  - You are about to drop the column `partOfDay` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "partOfDay",
ADD COLUMN     "timeRangeEnd" INTEGER NOT NULL DEFAULT 1320,
ADD COLUMN     "timeRangeStart" INTEGER NOT NULL DEFAULT 480;

-- DropEnum
DROP TYPE "PartOfDay";

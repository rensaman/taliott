/*
  Warnings:

  - Added the required column `name` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add with a temporary default, then drop the default
ALTER TABLE "Event" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Event" ALTER COLUMN "name" DROP DEFAULT;

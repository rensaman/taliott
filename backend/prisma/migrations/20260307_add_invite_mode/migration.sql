-- CreateEnum
CREATE TYPE "InviteMode" AS ENUM ('email_invites', 'shared_link');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "inviteMode" "InviteMode" NOT NULL DEFAULT 'email_invites';
ALTER TABLE "Event" ADD COLUMN "joinToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_joinToken_key" ON "Event"("joinToken");

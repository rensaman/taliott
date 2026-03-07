-- AddUniqueConstraint: enforce one participant per email per event
CREATE UNIQUE INDEX "Participant_eventId_email_key" ON "Participant"("eventId", "email");

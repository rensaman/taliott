import { sendEmail } from './mailer.js';

const DEFAULT_BASE_URL = 'http://localhost:3000';

export function buildParticipantInvite(participant, event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  return {
    to: participant.email,
    subject: `You're invited: ${event.name}`,
    text: [
      `Hi,`,
      ``,
      `You have been invited to vote for a time to meet up: "${event.name}".`,
      ``,
      `Cast your vote here:`,
      `${baseUrl}/participate/${participant.id}`,
      ``,
      `Voting deadline: ${new Date(event.deadline).toUTCString()}`,
    ].join('\n'),
  };
}

export async function sendEventInvites(event) {
  for (const participant of event.participants) {
    await sendEmail(buildParticipantInvite(participant, event));
  }
}

export function buildOrganizerConfirmation(event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  return {
    to: event.organizerEmail,
    subject: `Your event "${event.name}" is ready`,
    text: [
      `Hi,`,
      ``,
      `Your event "${event.name}" has been created successfully.`,
      ``,
      `Manage your event here (keep this link private):`,
      `${baseUrl}/admin/${event.adminToken}`,
      ``,
      `Voting deadline: ${new Date(event.deadline).toUTCString()}`,
      ``,
      `Participants have been sent their individual voting links.`,
    ].join('\n'),
  };
}

export async function sendOrganizerConfirmation(event) {
  await sendEmail(buildOrganizerConfirmation(event));
}

import { sendEmail } from './mailer.js';
import { generateICS } from './ics.js';

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

export function buildJoinConfirmation(participant, event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  return {
    to: participant.email,
    subject: `You're registered: ${event.name}`,
    text: [
      `Hi${participant.name ? ` ${participant.name}` : ''},`,
      ``,
      `You've successfully registered for "${event.name}".`,
      ``,
      `Access your personal voting link here:`,
      `${baseUrl}/participate/${participant.id}`,
      ``,
      `Voting deadline: ${new Date(event.deadline).toUTCString()}`,
    ].join('\n'),
  };
}

export async function sendJoinConfirmation(participant, event) {
  await sendEmail(buildJoinConfirmation(participant, event));
}

export function buildFinalizationEmail(recipient, event, slot, venue) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const slotStart = new Date(slot.startsAt).toUTCString();
  const venueLine = venue ? `Venue: ${venue.name}` : 'Venue: TBD';
  const icsContent = generateICS({ slot, venue, eventName: event.name });

  return {
    to: recipient.email,
    subject: `Event finalized: ${event.name}`,
    text: [
      `Hi${recipient.name ? ` ${recipient.name}` : ''},`,
      ``,
      `"${event.name}" has been finalized!`,
      ``,
      `When: ${slotStart}`,
      venueLine,
      ``,
      `Your participation link: ${baseUrl}/participate/${recipient.id}`,
      ``,
      `A calendar invite is attached.`,
    ].join('\n'),
    attachments: [{ filename: 'event.ics', content: icsContent }],
  };
}

export function buildOrganizerFinalizationEmail(event, slot, venue) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const slotStart = new Date(slot.startsAt).toUTCString();
  const venueLine = venue ? `Venue: ${venue.name}` : 'Venue: TBD';
  const icsContent = generateICS({ slot, venue, eventName: event.name });

  return {
    to: event.organizerEmail,
    subject: `Event finalized: ${event.name}`,
    text: [
      `Hi,`,
      ``,
      `You've finalized "${event.name}".`,
      ``,
      `When: ${slotStart}`,
      venueLine,
      ``,
      `Manage your event: ${baseUrl}/admin/${event.adminToken}`,
      ``,
      `A calendar invite is attached.`,
    ].join('\n'),
    attachments: [{ filename: 'event.ics', content: icsContent }],
  };
}

export async function sendFinalizationNotifications(event, slot, venue) {
  for (const participant of event.participants) {
    if (!participant.email) continue;
    await sendEmail(buildFinalizationEmail(participant, event, slot, venue));
  }
  await sendEmail(buildOrganizerFinalizationEmail(event, slot, venue));
}

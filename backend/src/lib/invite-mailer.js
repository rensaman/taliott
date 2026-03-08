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

export function buildOrganizerJoinNotification(participant, event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const participantLabel = participant.name
    ? `${participant.name} (${participant.email})`
    : participant.email;
  return {
    to: event.organizerEmail,
    subject: `New participant joined: ${event.name}`,
    text: [
      `Hi,`,
      ``,
      `${participantLabel} has just registered for your event "${event.name}".`,
      ``,
      `View your dashboard:`,
      `${baseUrl}/admin/${event.adminToken}`,
    ].join('\n'),
  };
}

export async function sendOrganizerJoinNotification(participant, event) {
  await sendEmail(buildOrganizerJoinNotification(participant, event));
}

/**
 * Resolves venue display info from either a Venue object or custom venue fields on the event.
 * Returns { name, address } or null if no venue info is available.
 */
function resolveVenueInfo(venue, event) {
  if (venue?.name) {
    return { name: venue.name, address: null };
  }
  if (event?.finalVenueName) {
    return { name: event.finalVenueName, address: event.finalVenueAddress ?? null };
  }
  return null;
}

export function buildFinalizationEmail(recipient, event, slot, venue) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const slotStart = new Date(slot.startsAt).toUTCString();
  const venueInfo = resolveVenueInfo(venue, event);
  const venueLine = venueInfo
    ? `Venue: ${venueInfo.address ? `${venueInfo.name}, ${venueInfo.address}` : venueInfo.name}`
    : 'Venue: TBD';
  const icsVenue = venueInfo ? { name: venueInfo.name, address: venueInfo.address } : null;
  const icsContent = generateICS({ slot, venue: icsVenue, eventName: event.name, timezone: event.timezone ?? 'UTC' });

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
  const venueInfo = resolveVenueInfo(venue, event);
  const venueLine = venueInfo
    ? `Venue: ${venueInfo.address ? `${venueInfo.name}, ${venueInfo.address}` : venueInfo.name}`
    : 'Venue: TBD';
  const icsVenue = venueInfo ? { name: venueInfo.name, address: venueInfo.address } : null;
  const icsContent = generateICS({ slot, venue: icsVenue, eventName: event.name, timezone: event.timezone ?? 'UTC' });

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

import { sendEmail } from './mailer.js';
import { generateICS } from './ics.js';

const DEFAULT_BASE_URL = 'http://localhost:3000';

/**
 * Strip CR and LF characters to prevent email header/body injection.
 * Applied to any user-controlled field embedded in email text or subjects.
 */
function sanitizeField(value) {
  if (typeof value !== 'string') return String(value ?? '');
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function buildParticipantInvite(participant, event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const eventName = sanitizeField(event.name);
  return {
    to: participant.email,
    subject: `You're invited: ${eventName}`,
    text: [
      `Hi,`,
      ``,
      `You have been invited to vote for a time to meet up: "${eventName}".`,
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
    if (participant.email === event.organizerEmail) continue;
    await sendEmail(buildParticipantInvite(participant, event));
  }
}

export function buildOrganizerConfirmation(event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const eventName = sanitizeField(event.name);
  return {
    to: event.organizerEmail,
    subject: `Your event "${eventName}" is ready`,
    text: [
      `Hi,`,
      ``,
      `Your event "${eventName}" has been created successfully.`,
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

export function buildOrganizerCreationEmail(event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const eventName = sanitizeField(event.name);
  const organizerParticipant = event.participants.find(p => p.email === event.organizerEmail);

  const lines = [
    `Hi,`,
    ``,
    `Your event "${eventName}" has been created successfully.`,
    ``,
    `Manage your event here (keep this link private):`,
    `${baseUrl}/admin/${event.adminToken}`,
  ];

  if (event.inviteMode === 'shared_link' && event.joinToken) {
    lines.push(``, `Share this link for others to join:`, `${baseUrl}/join/${event.joinToken}`);
  }

  if (organizerParticipant) {
    lines.push(``, `Your voting link:`, `${baseUrl}/participate/${organizerParticipant.id}`);
  }

  if (event.inviteMode === 'email_invites') {
    lines.push(``, `Participants have been sent their individual voting links.`);
  }

  lines.push(``, `Voting deadline: ${new Date(event.deadline).toUTCString()}`);

  return {
    to: event.organizerEmail,
    subject: `Your event "${eventName}" is ready`,
    text: lines.join('\n'),
  };
}

export async function sendOrganizerCreationEmail(event) {
  await sendEmail(buildOrganizerCreationEmail(event));
}

export function buildJoinConfirmation(participant, event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const eventName = sanitizeField(event.name);
  const participantName = participant.name ? sanitizeField(participant.name) : null;
  return {
    to: participant.email,
    subject: `You're registered: ${eventName}`,
    text: [
      `Hi${participantName ? ` ${participantName}` : ''},`,
      ``,
      `You've successfully registered for "${eventName}".`,
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
  const eventName = sanitizeField(event.name);
  const participantLabel = participant.name
    ? `${sanitizeField(participant.name)} (${participant.email})`
    : participant.email;
  return {
    to: event.organizerEmail,
    subject: `New participant joined: ${eventName}`,
    text: [
      `Hi,`,
      ``,
      `${participantLabel} has just registered for your event "${eventName}".`,
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
    return { name: venue.name, address: venue.address ?? null };
  }
  if (event?.finalVenueName) {
    return { name: event.finalVenueName, address: event.finalVenueAddress ?? null };
  }
  return null;
}

export function buildFinalizationEmail(recipient, event, slot, venue) {
  const eventName = sanitizeField(event.name);
  const recipientName = recipient.name ? sanitizeField(recipient.name) : null;
  const slotStart = new Date(slot.startsAt).toUTCString();
  const venueInfo = resolveVenueInfo(venue, event);
  const safeName = venueInfo ? sanitizeField(venueInfo.name) : null;
  const safeAddress = venueInfo?.address ? sanitizeField(venueInfo.address) : null;
  const venueLine = venueInfo
    ? `Venue: ${safeAddress ? `${safeName}, ${safeAddress}` : safeName}`
    : 'Venue: TBD';
  const icsVenue = venueInfo ? { name: safeName, address: safeAddress } : null;

  let icsContent = null;
  try {
    icsContent = generateICS({ slot, venue: icsVenue, eventName, timezone: event.timezone ?? 'UTC' });
  } catch (err) {
    console.error('[invite-mailer] ICS generation failed:', err);
  }

  return {
    to: recipient.email,
    subject: `Event finalized: ${eventName}`,
    text: [
      `Hi${recipientName ? ` ${recipientName}` : ''},`,
      ``,
      `"${eventName}" has been finalized!`,
      ``,
      `When: ${slotStart}`,
      venueLine,
      ``,
      `A calendar invite is attached.`,
    ].join('\n'),
    attachments: icsContent ? [{ filename: 'event.ics', content: icsContent }] : [],
  };
}

export function buildOrganizerFinalizationEmail(event, slot, venue) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const eventName = sanitizeField(event.name);
  const slotStart = new Date(slot.startsAt).toUTCString();
  const venueInfo = resolveVenueInfo(venue, event);
  const safeName = venueInfo ? sanitizeField(venueInfo.name) : null;
  const safeAddress = venueInfo?.address ? sanitizeField(venueInfo.address) : null;
  const venueLine = venueInfo
    ? `Venue: ${safeAddress ? `${safeName}, ${safeAddress}` : safeName}`
    : 'Venue: TBD';
  const icsVenue = venueInfo ? { name: safeName, address: safeAddress } : null;

  let icsContent = null;
  try {
    icsContent = generateICS({ slot, venue: icsVenue, eventName, timezone: event.timezone ?? 'UTC' });
  } catch (err) {
    console.error('[invite-mailer] ICS generation failed:', err);
  }

  return {
    to: event.organizerEmail,
    subject: `Event finalized: ${eventName}`,
    text: [
      `Hi,`,
      ``,
      `You've finalized "${eventName}".`,
      ``,
      `When: ${slotStart}`,
      venueLine,
      ``,
      `Manage your event: ${baseUrl}/admin/${event.adminToken}`,
      ``,
      `A calendar invite is attached.`,
    ].join('\n'),
    attachments: icsContent ? [{ filename: 'event.ics', content: icsContent }] : [],
  };
}

export async function sendFinalizationNotifications(event, slot, venue) {
  for (const participant of event.participants) {
    if (!participant.email) continue;
    if (participant.email === event.organizerEmail) continue;
    await sendEmail(buildFinalizationEmail(participant, event, slot, venue));
  }
  await sendEmail(buildOrganizerFinalizationEmail(event, slot, venue));
}

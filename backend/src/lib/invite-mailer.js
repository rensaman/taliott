import { sendEmail } from './mailer.js';
import { generateICS } from './ics.js';
import { t } from './t.js';

const DEFAULT_BASE_URL = 'http://localhost:3000';

/**
 * Strip CR and LF characters to prevent email header/body injection.
 * Applied to any user-controlled field embedded in email text or subjects.
 */
function sanitizeField(value) {
  if (typeof value !== 'string') return String(value ?? '');
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function lang(event) {
  return event.lang ?? 'en';
}

export function buildParticipantInvite(participant, event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const eventName = sanitizeField(event.name);
  const l = lang(event);
  return {
    to: participant.email,
    subject: t(l, 'participantInvite.subject', { eventName }),
    text: [
      t(l, 'participantInvite.greeting'),
      ``,
      t(l, 'participantInvite.invited', { eventName }),
      ``,
      t(l, 'participantInvite.castVoteHere'),
      `${baseUrl}/participate/${participant.id}`,
      ``,
      t(l, 'participantInvite.deadline', { deadline: new Date(event.deadline).toUTCString() }),
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
  const l = lang(event);
  return {
    to: event.organizerEmail,
    subject: t(l, 'organizerConfirmation.subject', { eventName }),
    text: [
      t(l, 'organizerConfirmation.greeting'),
      ``,
      t(l, 'organizerConfirmation.created', { eventName }),
      ``,
      t(l, 'organizerConfirmation.manageLink'),
      `${baseUrl}/admin/${event.adminToken}`,
      ``,
      t(l, 'organizerConfirmation.deadline', { deadline: new Date(event.deadline).toUTCString() }),
      ``,
      t(l, 'organizerConfirmation.participantsSent'),
    ].join('\n'),
  };
}

export async function sendOrganizerConfirmation(event) {
  await sendEmail(buildOrganizerConfirmation(event));
}

export function buildOrganizerCreationEmail(event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const eventName = sanitizeField(event.name);
  const l = lang(event);
  const organizerParticipant = event.participants.find(p => p.email === event.organizerEmail);

  const lines = [
    t(l, 'organizerCreation.greeting'),
    ``,
    t(l, 'organizerCreation.created', { eventName }),
    ``,
    t(l, 'organizerCreation.manageLink'),
    `${baseUrl}/admin/${event.adminToken}`,
  ];

  if (event.inviteMode === 'shared_link' && event.joinToken) {
    lines.push(``, t(l, 'organizerCreation.shareLink'), `${baseUrl}/join/${event.joinToken}`);
  }

  if (organizerParticipant) {
    lines.push(``, t(l, 'organizerCreation.yourVotingLink'), `${baseUrl}/participate/${organizerParticipant.id}`);
  }

  if (event.inviteMode === 'email_invites') {
    lines.push(``, t(l, 'organizerCreation.participantsSent'));
  }

  lines.push(``, t(l, 'organizerCreation.deadline', { deadline: new Date(event.deadline).toUTCString() }));

  return {
    to: event.organizerEmail,
    subject: t(l, 'organizerCreation.subject', { eventName }),
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
  const l = lang(event);
  const greeting = participantName
    ? t(l, 'joinConfirmation.greetingNamed', { name: participantName })
    : t(l, 'joinConfirmation.greeting');
  return {
    to: participant.email,
    subject: t(l, 'joinConfirmation.subject', { eventName }),
    text: [
      greeting,
      ``,
      t(l, 'joinConfirmation.registered', { eventName }),
      ``,
      t(l, 'joinConfirmation.accessLink'),
      `${baseUrl}/participate/${participant.id}`,
      ``,
      t(l, 'joinConfirmation.deadline', { deadline: new Date(event.deadline).toUTCString() }),
    ].join('\n'),
  };
}

export async function sendJoinConfirmation(participant, event) {
  await sendEmail(buildJoinConfirmation(participant, event));
}

export function buildOrganizerJoinNotification(participant, event) {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL;
  const eventName = sanitizeField(event.name);
  const l = lang(event);
  const participantLabel = participant.name
    ? `${sanitizeField(participant.name)} (${participant.email})`
    : participant.email;
  return {
    to: event.organizerEmail,
    subject: t(l, 'organizerJoinNotification.subject', { eventName }),
    text: [
      t(l, 'organizerJoinNotification.greeting'),
      ``,
      t(l, 'organizerJoinNotification.joined', { participantLabel, eventName }),
      ``,
      t(l, 'organizerJoinNotification.viewDashboard'),
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
  const l = lang(event);

  const venueLine = venueInfo
    ? t(l, 'finalizationEmail.venueKnown', { venue: safeAddress ? `${safeName}, ${safeAddress}` : safeName })
    : t(l, 'finalizationEmail.venueTBD');
  const icsVenue = venueInfo ? { name: safeName, address: safeAddress } : null;

  let icsContent = null;
  try {
    icsContent = generateICS({ slot, venue: icsVenue, eventName, timezone: event.timezone ?? 'UTC' });
  } catch (err) {
    console.error('[invite-mailer] ICS generation failed:', err);
  }

  const greeting = recipientName
    ? t(l, 'finalizationEmail.greetingNamed', { name: recipientName })
    : t(l, 'finalizationEmail.greeting');

  return {
    to: recipient.email,
    subject: t(l, 'finalizationEmail.subject', { eventName }),
    text: [
      greeting,
      ``,
      t(l, 'finalizationEmail.finalized', { eventName }),
      ``,
      t(l, 'finalizationEmail.when', { slot: slotStart }),
      venueLine,
      ``,
      t(l, 'finalizationEmail.calendarAttached'),
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
  const l = lang(event);

  const venueLine = venueInfo
    ? t(l, 'organizerFinalizationEmail.venueKnown', { venue: safeAddress ? `${safeName}, ${safeAddress}` : safeName })
    : t(l, 'organizerFinalizationEmail.venueTBD');
  const icsVenue = venueInfo ? { name: safeName, address: safeAddress } : null;

  let icsContent = null;
  try {
    icsContent = generateICS({ slot, venue: icsVenue, eventName, timezone: event.timezone ?? 'UTC' });
  } catch (err) {
    console.error('[invite-mailer] ICS generation failed:', err);
  }

  return {
    to: event.organizerEmail,
    subject: t(l, 'organizerFinalizationEmail.subject', { eventName }),
    text: [
      t(l, 'organizerFinalizationEmail.greeting'),
      ``,
      t(l, 'organizerFinalizationEmail.finalized', { eventName }),
      ``,
      t(l, 'organizerFinalizationEmail.when', { slot: slotStart }),
      venueLine,
      ``,
      t(l, 'organizerFinalizationEmail.manageEvent', { adminUrl: `${baseUrl}/admin/${event.adminToken}` }),
      ``,
      t(l, 'organizerFinalizationEmail.calendarAttached'),
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

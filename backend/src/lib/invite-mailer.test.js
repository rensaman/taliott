import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./mailer.js', () => ({ sendEmail: vi.fn() }));
vi.mock('./ics.js', () => ({ generateICS: vi.fn().mockReturnValue('BEGIN:VCALENDAR\r\nEND:VCALENDAR') }));

import {
  buildParticipantInvite,
  sendEventInvites,
  buildOrganizerConfirmation,
  sendOrganizerConfirmation,
  buildOrganizerCreationEmail,
  sendOrganizerCreationEmail,
  buildJoinConfirmation,
  sendJoinConfirmation,
  buildOrganizerJoinNotification,
  sendOrganizerJoinNotification,
  buildFinalizationEmail,
  buildOrganizerFinalizationEmail,
  sendFinalizationNotifications,
} from './invite-mailer.js';
import { sendEmail } from './mailer.js';

const event = {
  id: 'evt-id',
  name: 'Summer Meetup',
  deadline: new Date('2025-06-01T12:00:00Z'),
  adminToken: 'admin-token-uuid',
  organizerEmail: 'organizer@example.com',
  participants: [
    { id: 'p-uuid-1', email: 'alice@example.com' },
    { id: 'p-uuid-2', email: 'bob@example.com' },
  ],
};

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.APP_BASE_URL;
});

describe('buildParticipantInvite', () => {
  it('sets to as participant email', () => {
    const msg = buildParticipantInvite(event.participants[0], event);
    expect(msg.to).toBe('alice@example.com');
  });

  it('includes event name in subject', () => {
    const msg = buildParticipantInvite(event.participants[0], event);
    expect(msg.subject).toContain('Summer Meetup');
  });

  it('includes participate link with participant id in body', () => {
    const msg = buildParticipantInvite(event.participants[0], event);
    expect(msg.text).toContain('/participate/p-uuid-1');
  });

  it('uses APP_BASE_URL env var in link', () => {
    process.env.APP_BASE_URL = 'https://myapp.example.com';
    const msg = buildParticipantInvite(event.participants[0], event);
    expect(msg.text).toContain('https://myapp.example.com/participate/p-uuid-1');
  });

  it('includes voting deadline in body', () => {
    const msg = buildParticipantInvite(event.participants[0], event);
    expect(msg.text).toMatch(/deadline/i);
  });
});

describe('sendEventInvites', () => {
  it('calls sendEmail once per non-organizer participant', async () => {
    await sendEventInvites(event);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('sends to each participant email', async () => {
    await sendEventInvites(event);
    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients).toContain('alice@example.com');
    expect(recipients).toContain('bob@example.com');
  });

  it('skips participant whose email matches organizerEmail', async () => {
    const eventWithOrganizer = {
      ...event,
      participants: [...event.participants, { id: 'p-org', email: 'organizer@example.com' }],
    };
    await sendEventInvites(eventWithOrganizer);
    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients).not.toContain('organizer@example.com');
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});

describe('buildOrganizerConfirmation', () => {
  it('sends to organizer email', () => {
    const msg = buildOrganizerConfirmation(event);
    expect(msg.to).toBe('organizer@example.com');
  });

  it('includes event name in subject', () => {
    const msg = buildOrganizerConfirmation(event);
    expect(msg.subject).toContain('Summer Meetup');
  });

  it('includes admin link in body', () => {
    const msg = buildOrganizerConfirmation(event);
    expect(msg.text).toContain('/admin/admin-token-uuid');
  });

  it('uses APP_BASE_URL env var in admin link', () => {
    process.env.APP_BASE_URL = 'https://myapp.example.com';
    const msg = buildOrganizerConfirmation(event);
    expect(msg.text).toContain('https://myapp.example.com/admin/admin-token-uuid');
  });

  it('subject is distinct from participant invite subject', () => {
    const orgMsg = buildOrganizerConfirmation(event);
    const partMsg = buildParticipantInvite(event.participants[0], event);
    expect(orgMsg.subject).not.toBe(partMsg.subject);
  });
});

describe('sendOrganizerConfirmation', () => {
  it('calls sendEmail once with organizer email', async () => {
    await sendOrganizerConfirmation(event);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'organizer@example.com' }));
  });
});

describe('buildOrganizerCreationEmail', () => {
  const organizerParticipant = { id: 'p-org', email: 'organizer@example.com' };
  const emailInvitesEvent = {
    ...event,
    inviteMode: 'email_invites',
    joinToken: null,
    participants: [...event.participants, organizerParticipant],
  };
  const sharedLinkEvent = {
    ...event,
    inviteMode: 'shared_link',
    joinToken: 'join-token-uuid',
    participants: [organizerParticipant],
  };

  it('sends to organizer email', () => {
    const msg = buildOrganizerCreationEmail(emailInvitesEvent);
    expect(msg.to).toBe('organizer@example.com');
  });

  it('includes admin link', () => {
    const msg = buildOrganizerCreationEmail(emailInvitesEvent);
    expect(msg.text).toContain('/admin/admin-token-uuid');
  });

  it('includes organizer voting link for email_invites mode', () => {
    const msg = buildOrganizerCreationEmail(emailInvitesEvent);
    expect(msg.text).toContain('/participate/p-org');
  });

  it('includes join link for shared_link mode', () => {
    const msg = buildOrganizerCreationEmail(sharedLinkEvent);
    expect(msg.text).toContain('/join/join-token-uuid');
  });

  it('includes organizer voting link for shared_link mode', () => {
    const msg = buildOrganizerCreationEmail(sharedLinkEvent);
    expect(msg.text).toContain('/participate/p-org');
  });

  it('does not include join link for email_invites mode', () => {
    const msg = buildOrganizerCreationEmail(emailInvitesEvent);
    expect(msg.text).not.toContain('/join/');
  });
});

describe('sendOrganizerCreationEmail', () => {
  it('calls sendEmail once with organizer email', async () => {
    const emailInvitesEvent = {
      ...event,
      inviteMode: 'email_invites',
      joinToken: null,
      participants: [...event.participants, { id: 'p-org', email: 'organizer@example.com' }],
    };
    await sendOrganizerCreationEmail(emailInvitesEvent);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'organizer@example.com' }));
  });
});

describe('buildJoinConfirmation', () => {
  const participant = { id: 'p-join-1', email: 'joiner@example.com', name: null };

  it('sends to participant email', () => {
    const msg = buildJoinConfirmation(participant, event);
    expect(msg.to).toBe('joiner@example.com');
  });

  it('includes event name in subject', () => {
    const msg = buildJoinConfirmation(participant, event);
    expect(msg.subject).toContain('Summer Meetup');
  });

  it('includes participate link in body', () => {
    const msg = buildJoinConfirmation(participant, event);
    expect(msg.text).toContain('/participate/p-join-1');
  });

  it('includes participant name in greeting when provided', () => {
    const named = { ...participant, name: 'Joiner' };
    const msg = buildJoinConfirmation(named, event);
    expect(msg.text).toContain('Joiner');
  });
});

describe('sendJoinConfirmation', () => {
  it('calls sendEmail once with participant email', async () => {
    const participant = { id: 'p-join-1', email: 'joiner@example.com', name: null };
    await sendJoinConfirmation(participant, event);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'joiner@example.com' }));
  });
});

describe('buildOrganizerJoinNotification', () => {
  const participant = { id: 'p-join-1', email: 'joiner@example.com', name: 'Jo' };

  it('sends to organizer email', () => {
    const msg = buildOrganizerJoinNotification(participant, event);
    expect(msg.to).toBe('organizer@example.com');
  });

  it('subject mentions "New participant joined" and the event name', () => {
    const msg = buildOrganizerJoinNotification(participant, event);
    expect(msg.subject).toMatch(/new participant joined/i);
    expect(msg.subject).toContain('Summer Meetup');
  });

  it('body includes participant name and email', () => {
    const msg = buildOrganizerJoinNotification(participant, event);
    expect(msg.text).toContain('Jo');
    expect(msg.text).toContain('joiner@example.com');
  });

  it('body includes admin dashboard link', () => {
    const msg = buildOrganizerJoinNotification(participant, event);
    expect(msg.text).toContain('/admin/admin-token-uuid');
  });
});

describe('sendOrganizerJoinNotification', () => {
  it('calls sendEmail once with organizer email', async () => {
    const participant = { id: 'p-join-1', email: 'joiner@example.com', name: null };
    await sendOrganizerJoinNotification(participant, event);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'organizer@example.com' }));
  });
});

const slot = {
  startsAt: new Date('2025-06-15T09:00:00.000Z'),
  endsAt: new Date('2025-06-15T10:00:00.000Z'),
};
const venue = { name: 'The Anchor Pub' };

describe('buildFinalizationEmail', () => {
  const participant = { id: 'p-uuid-1', email: 'alice@example.com', name: 'Alice' };

  it('sends to participant email', () => {
    const msg = buildFinalizationEmail(participant, event, slot, venue);
    expect(msg.to).toBe('alice@example.com');
  });

  it('subject contains event name', () => {
    const msg = buildFinalizationEmail(participant, event, slot, venue);
    expect(msg.subject).toContain('Summer Meetup');
    expect(msg.subject).toMatch(/finalized/i);
  });

  it('body includes venue name', () => {
    const msg = buildFinalizationEmail(participant, event, slot, venue);
    expect(msg.text).toContain('The Anchor Pub');
  });

  it('body does not include participation link', () => {
    const msg = buildFinalizationEmail(participant, event, slot, venue);
    expect(msg.text).not.toContain('/participate/');
  });

  it('has an ICS attachment', () => {
    const msg = buildFinalizationEmail(participant, event, slot, venue);
    expect(msg.attachments).toBeDefined();
    expect(msg.attachments[0].filename).toBe('event.ics');
    expect(msg.attachments[0].content).toContain('BEGIN:VCALENDAR');
  });

  it('body says TBD when no venue provided', () => {
    const msg = buildFinalizationEmail(participant, event, slot, null);
    expect(msg.text).toContain('TBD');
  });

  it('uses custom venue name from event when no venue object but event has finalVenueName', () => {
    const eventWithCustomVenue = { ...event, finalVenueName: 'Custom Hall', finalVenueAddress: '5 Oak St' };
    const msg = buildFinalizationEmail(participant, eventWithCustomVenue, slot, null);
    expect(msg.text).toContain('Custom Hall');
    expect(msg.text).toContain('5 Oak St');
  });
});

describe('buildOrganizerFinalizationEmail', () => {
  it('sends to organizer email', () => {
    const msg = buildOrganizerFinalizationEmail(event, slot, venue);
    expect(msg.to).toBe('organizer@example.com');
  });

  it('subject contains event name and finalized', () => {
    const msg = buildOrganizerFinalizationEmail(event, slot, venue);
    expect(msg.subject).toContain('Summer Meetup');
    expect(msg.subject).toMatch(/finalized/i);
  });

  it('body includes admin link', () => {
    const msg = buildOrganizerFinalizationEmail(event, slot, venue);
    expect(msg.text).toContain('/admin/admin-token-uuid');
  });

  it('has an ICS attachment', () => {
    const msg = buildOrganizerFinalizationEmail(event, slot, venue);
    expect(msg.attachments).toBeDefined();
    expect(msg.attachments[0].filename).toBe('event.ics');
  });
});

describe('i18n: event.lang is respected', () => {
  it('buildParticipantInvite uses English when event.lang is "en"', () => {
    const msg = buildParticipantInvite(event.participants[0], { ...event, lang: 'en' });
    expect(msg.subject).toContain("You're invited");
    expect(msg.text).toContain('vote');
  });

  it('buildParticipantInvite uses Hungarian when event.lang is "hu"', () => {
    const msg = buildParticipantInvite(event.participants[0], { ...event, lang: 'hu' });
    expect(msg.subject).toContain('Meghívó');
    expect(msg.text).toContain('szavazz');
  });

  it('buildParticipantInvite defaults to English when event.lang is missing', () => {
    const { lang: _ignored, ...eventNoLang } = { ...event, lang: undefined };
    const msg = buildParticipantInvite(event.participants[0], eventNoLang);
    expect(msg.subject).toContain("You're invited");
  });

  it('buildOrganizerCreationEmail uses Hungarian when event.lang is "hu"', () => {
    const huEvent = {
      ...event,
      lang: 'hu',
      inviteMode: 'email_invites',
      joinToken: null,
      participants: [...event.participants, { id: 'p-org', email: 'organizer@example.com' }],
    };
    const msg = buildOrganizerCreationEmail(huEvent);
    expect(msg.subject).not.toContain('Your event');
    expect(msg.subject).toContain('Summer Meetup');
  });

  it('buildJoinConfirmation uses Hungarian when event.lang is "hu"', () => {
    const participant = { id: 'p-join-1', email: 'joiner@example.com', name: 'Jo' };
    const msg = buildJoinConfirmation(participant, { ...event, lang: 'hu' });
    expect(msg.subject).toContain('Regisztráltál');
  });

  it('buildFinalizationEmail uses Hungarian when event.lang is "hu"', () => {
    const participant = { id: 'p-uuid-1', email: 'alice@example.com', name: 'Alice' };
    const msg = buildFinalizationEmail(participant, { ...event, lang: 'hu' }, slot, venue);
    expect(msg.subject).toContain('véglegesítve');
  });

  it('buildOrganizerFinalizationEmail uses Hungarian when event.lang is "hu"', () => {
    const msg = buildOrganizerFinalizationEmail({ ...event, lang: 'hu' }, slot, venue);
    expect(msg.subject).toContain('véglegesítve');
    expect(msg.text).toContain('Véglegesítetted');
  });
});

describe('sendFinalizationNotifications', () => {
  it('calls sendEmail for each non-organizer participant + organizer', async () => {
    await sendFinalizationNotifications(event, slot, venue);
    // 2 participants (neither is organizer) + 1 organizer = 3
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it('sends to all participant emails and organizer', async () => {
    await sendFinalizationNotifications(event, slot, venue);
    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients).toContain('alice@example.com');
    expect(recipients).toContain('bob@example.com');
    expect(recipients).toContain('organizer@example.com');
  });

  it('skips participants with no email (shared_link mode)', async () => {
    const eventWithNullEmail = {
      ...event,
      participants: [{ id: 'p1', email: null, name: null }, ...event.participants],
    };
    await sendFinalizationNotifications(eventWithNullEmail, slot, venue);
    // 2 real participants + 1 organizer = 3 (null email skipped)
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it('does not send duplicate email to organizer when they are also a participant', async () => {
    const eventWithOrgAsParticipant = {
      ...event,
      participants: [...event.participants, { id: 'p-org', email: 'organizer@example.com', name: null }],
    };
    await sendFinalizationNotifications(eventWithOrgAsParticipant, slot, venue);
    // alice + bob + organizer (once) = 3, not 4
    expect(sendEmail).toHaveBeenCalledTimes(3);
    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients.filter(r => r === 'organizer@example.com')).toHaveLength(1);
  });
});

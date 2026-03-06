import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./mailer.js', () => ({ sendEmail: vi.fn() }));

import { buildParticipantInvite, sendEventInvites } from './invite-mailer.js';
import { sendEmail } from './mailer.js';

const event = {
  id: 'evt-id',
  name: 'Summer Meetup',
  deadline: new Date('2025-06-01T12:00:00Z'),
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
  it('calls sendEmail once per participant', async () => {
    await sendEventInvites(event);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('sends to each participant email', async () => {
    await sendEventInvites(event);
    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients).toContain('alice@example.com');
    expect(recipients).toContain('bob@example.com');
  });
});

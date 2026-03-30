/**
 * Integration tests for POST /api/resend-link (US 1.7 — Link Recovery)
 * Requires the test DB: npm run test:integration
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

vi.mock('../../src/lib/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import app from '../../src/index.js';
import { sendEmail } from '../../src/lib/mailer.js';
import { clearRateLimitStore } from '../../src/routes/resend-link.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const FUTURE_DEADLINE = '2099-12-31T23:59:59.000Z';

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
  clearRateLimitStore();
});

async function createEvent(overrides = {}) {
  const res = await request(app).post('/api/events').send({
    name: 'Resend Test Event',
    organizer_email: 'org@resend-test.com',
    invite_mode: 'email_invites',
    participant_emails: ['participant@resend-test.com'],
    date_range_start: '2025-06-01',
    date_range_end: '2025-06-01',
    time_range_start: 480, time_range_end: 720,
    timezone: 'UTC',
    deadline: FUTURE_DEADLINE,
    ...overrides,
  });
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  return res.body;
}

describe('POST /api/resend-link', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/resend-link').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for a malformed email address (S-3)', async () => {
    const res = await request(app).post('/api/resend-link').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an email with only a domain (S-3)', async () => {
    const res = await request(app).post('/api/resend-link').send({ email: '@nodomain' });
    expect(res.status).toBe(400);
  });

  it('returns 200 for unknown email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/resend-link')
      .send({ email: 'nobody@unknown.com' });
    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends admin link when email matches an organizer', async () => {
    await createEvent({ organizer_email: 'org-resend-1@example.com', participant_emails: [] });

    const res = await request(app)
      .post('/api/resend-link')
      .send({ email: 'org-resend-1@example.com' });

    expect(res.status).toBe(200);
    const calls = sendEmail.mock.calls.map(([msg]) => msg);
    const adminEmail = calls.find(m => m.to === 'org-resend-1@example.com' && m.text.includes('/admin/'));
    expect(adminEmail).toBeDefined();
  });

  it('sends participation link when email matches a participant (email_invites mode)', async () => {
    await createEvent({
      organizer_email: 'org-resend-2@example.com',
      participant_emails: ['part-resend-2@example.com'],
    });

    const res = await request(app)
      .post('/api/resend-link')
      .send({ email: 'part-resend-2@example.com' });

    expect(res.status).toBe(200);
    const calls = sendEmail.mock.calls.map(([msg]) => msg);
    const partEmail = calls.find(m => m.to === 'part-resend-2@example.com' && m.text.includes('/participate/'));
    expect(partEmail).toBeDefined();
  });

  it('sends participation link when email matches a shared_link participant', async () => {
    const event = await createEvent({
      organizer_email: 'org-resend-3@example.com',
      invite_mode: 'shared_link',
      participant_emails: [],
    });

    // Register via join link
    const joinToken = event.join_url.replace('/join/', '');
    await request(app)
      .post(`/api/join/${joinToken}`)
      .send({ email: 'joiner-resend-3@example.com' });

    vi.clearAllMocks();

    const res = await request(app)
      .post('/api/resend-link')
      .send({ email: 'joiner-resend-3@example.com' });

    expect(res.status).toBe(200);
    const calls = sendEmail.mock.calls.map(([msg]) => msg);
    const partEmail = calls.find(m => m.to === 'joiner-resend-3@example.com' && m.text.includes('/participate/'));
    expect(partEmail).toBeDefined();
  });

  it('sends both admin and participant links when email is both organizer and participant', async () => {
    // Organizer is always auto-enrolled as participant
    await createEvent({
      organizer_email: 'both-resend-4@example.com',
      participant_emails: [],
    });

    const res = await request(app)
      .post('/api/resend-link')
      .send({ email: 'both-resend-4@example.com' });

    expect(res.status).toBe(200);
    const calls = sendEmail.mock.calls.map(([msg]) => msg);
    const adminEmail = calls.find(m => m.text.includes('/admin/'));
    const partEmail = calls.find(m => m.text.includes('/participate/'));
    expect(adminEmail).toBeDefined();
    expect(partEmail).toBeDefined();
  });

  it('returns 429 after exceeding rate limit (3 per 15 minutes)', async () => {
    const email = 'ratelimit-resend-5@example.com';

    const r1 = await request(app).post('/api/resend-link').send({ email });
    const r2 = await request(app).post('/api/resend-link').send({ email });
    const r3 = await request(app).post('/api/resend-link').send({ email });
    const r4 = await request(app).post('/api/resend-link').send({ email });

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(r4.status).toBe(429);
  });
});

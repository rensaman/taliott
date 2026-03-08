/**
 * Integration tests for US 1.6 — join confirmation email + organizer notification
 * Mocks the mailer to assert sendEmail is called with the participation link.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

vi.mock('../../src/lib/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import app from '../../src/index.js';
import { sendEmail } from '../../src/lib/mailer.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const createdEventIds = [];

const BASE_EVENT = {
  name: 'Join Email Test',
  organizer_email: 'org@example.com',
  invite_mode: 'shared_link',
  date_range_start: '2025-09-01',
  date_range_end: '2025-09-01',
  part_of_day: 'morning',
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
};

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/join/:joinToken — confirmation email', () => {
  it('sends confirmation email with participation link to the joiner', async () => {
    const createRes = await request(app).post('/api/events').send(BASE_EVENT);
    expect(createRes.status).toBe(201);
    createdEventIds.push(createRes.body.event_id);
    const joinToken = createRes.body.join_url.replace('/join/', '');

    vi.clearAllMocks();

    const joinRes = await request(app)
      .post(`/api/join/${joinToken}`)
      .send({ email: 'joiner@example.com' });
    expect(joinRes.status).toBe(201);

    // Allow fire-and-forget emails to settle
    await new Promise(r => setTimeout(r, 50));

    // 2 emails: confirmation to joiner + organizer notification
    const toAddresses = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(toAddresses).toContain('joiner@example.com');

    const joinerMsg = sendEmail.mock.calls.find(([msg]) => msg.to === 'joiner@example.com')[0];
    expect(joinerMsg.text).toContain(`/participate/${joinRes.body.participant_id}`);
  });

  it('sends one confirmation email per join (including re-joins), no second organizer notification', async () => {
    const createRes = await request(app).post('/api/events').send(BASE_EVENT);
    expect(createRes.status).toBe(201);
    createdEventIds.push(createRes.body.event_id);
    const joinToken = createRes.body.join_url.replace('/join/', '');

    vi.clearAllMocks();

    // First join: sends 2 emails (confirmation + organizer notification)
    await request(app).post(`/api/join/${joinToken}`).send({ email: 'repeat2@example.com' });
    await new Promise(r => setTimeout(r, 50));
    expect(sendEmail).toHaveBeenCalledTimes(2);

    vi.clearAllMocks();

    // Second join with same email — sends only 1 email (confirmation, no organizer notification)
    const second = await request(app)
      .post(`/api/join/${joinToken}`)
      .send({ email: 'repeat2@example.com' });
    expect(second.status).toBe(201);
    await new Promise(r => setTimeout(r, 50));
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe('repeat2@example.com');
  });
});

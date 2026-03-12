/**
 * Integration tests for US 1.6 — Self-Registration via Shared Join Link
 * Tests GET /api/join/:joinToken and POST /api/join/:joinToken
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

vi.mock('../../src/lib/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import app from '../../src/index.js';
import { sendEmail } from '../../src/lib/mailer.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const BASE_EVENT = {
  name: 'Join Token Test',
  organizer_email: 'org@example.com',
  invite_mode: 'shared_link',
  date_range_start: '2025-09-01',
  date_range_end: '2025-09-01',
  part_of_day: 'morning',
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
};

let joinToken;
let eventId;

beforeAll(async () => {
  const res = await request(app).post('/api/events').send(BASE_EVENT);
  expect(res.status).toBe(201);
  eventId = res.body.event_id;
  createdEventIds.push(eventId);
  joinToken = res.body.join_url.replace('/join/', '');
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

describe('GET /api/join/:joinToken', () => {
  it('returns event name and deadline for a valid token', async () => {
    const res = await request(app).get(`/api/join/${joinToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(BASE_EVENT.name);
    expect(res.body.deadline).toBeDefined();
    expect(res.body.status).toBe('open');
  });

  it('returns status locked for an event past deadline', async () => {
    const locked = await request(app).post('/api/events').send({
      ...BASE_EVENT,
      deadline: '2000-01-01T00:00:00.000Z',
    });
    createdEventIds.push(locked.body.event_id);
    const lockedToken = locked.body.join_url.replace('/join/', '');

    const res = await request(app).get(`/api/join/${lockedToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('locked');
  });

  it('returns 404 for an unknown token', async () => {
    const res = await request(app).get('/api/join/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/join/:joinToken', () => {
  it('creates a Participant and returns participant_id', async () => {
    const res = await request(app).post(`/api/join/${joinToken}`).send({
      email: 'alice@example.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.participant_id).toBeDefined();
  });

  it('returns the same participant_id for the same email (idempotent)', async () => {
    const first = await request(app).post(`/api/join/${joinToken}`).send({
      email: 'bob@example.com',
    });
    expect(first.status).toBe(201);

    const second = await request(app).post(`/api/join/${joinToken}`).send({
      email: 'bob@example.com',
    });
    expect(second.status).toBe(201);
    expect(second.body.participant_id).toBe(first.body.participant_id);
  });

  it('allows multiple different participants to register via the same join link', async () => {
    const first = await request(app).post(`/api/join/${joinToken}`).send({
      email: 'person-one@example.com',
    });
    expect(first.status).toBe(201);
    expect(first.body.participant_id).toBeDefined();

    const second = await request(app).post(`/api/join/${joinToken}`).send({
      email: 'person-two@example.com',
    });
    expect(second.status).toBe(201);
    expect(second.body.participant_id).toBeDefined();

    expect(second.body.participant_id).not.toBe(first.body.participant_id);

    const participants = await prisma.participant.findMany({
      where: { eventId, email: { in: ['person-one@example.com', 'person-two@example.com'] } },
    });
    expect(participants).toHaveLength(2);
  });

  it('persists optional name when provided', async () => {
    const res = await request(app).post(`/api/join/${joinToken}`).send({
      email: 'named@example.com',
      name: 'Carol',
    });
    expect(res.status).toBe(201);
    const participant = await prisma.participant.findUnique({
      where: { id: res.body.participant_id },
    });
    expect(participant.name).toBe('Carol');
  });

  it('saves name on re-registration when participant previously had none', async () => {
    // Simulate pre-created participant (e.g. added by organiser) with no name
    const pre = await prisma.participant.create({
      data: { eventId, email: 'nameless@example.com', name: null },
    });

    const res = await request(app).post(`/api/join/${joinToken}`).send({
      email: 'nameless@example.com',
      name: 'Dave',
    });
    expect(res.status).toBe(201);
    expect(res.body.participant_id).toBe(pre.id);

    const updated = await prisma.participant.findUnique({ where: { id: pre.id } });
    expect(updated.name).toBe('Dave');
  });

  it('does not overwrite existing name on re-registration', async () => {
    await request(app).post(`/api/join/${joinToken}`).send({
      email: 'hasname@example.com',
      name: 'Original',
    });

    const res = await request(app).post(`/api/join/${joinToken}`).send({
      email: 'hasname@example.com',
      name: 'Different',
    });
    expect(res.status).toBe(201);

    const participant = await prisma.participant.findUnique({
      where: { id: res.body.participant_id },
    });
    expect(participant.name).toBe('Original');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post(`/api/join/${joinToken}`).send({
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post(`/api/join/${joinToken}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 404 for an unknown token', async () => {
    const res = await request(app).post('/api/join/00000000-0000-0000-0000-000000000000').send({
      email: 'nobody@example.com',
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 on a locked event', async () => {
    const locked = await request(app).post('/api/events').send({
      ...BASE_EVENT,
      deadline: '2000-01-01T00:00:00.000Z', // past deadline = locked
    });
    createdEventIds.push(locked.body.event_id);
    const lockedToken = locked.body.join_url.replace('/join/', '');

    const res = await request(app).post(`/api/join/${lockedToken}`).send({
      email: 'late@example.com',
    });
    expect(res.status).toBe(403);
  });

  it('sends a confirmation email to the participant on successful registration', async () => {
    await request(app).post(`/api/join/${joinToken}`).send({
      email: 'email-check@example.com',
    });
    await new Promise(r => setTimeout(r, 50));

    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients).toContain('email-check@example.com');
  });
});

describe('POST /api/join/:joinToken — organizer notification', () => {
  it('sends organizer a notification email when a new participant registers', async () => {
    await request(app).post(`/api/join/${joinToken}`).send({
      email: 'new-notify@example.com',
    });
    await new Promise(r => setTimeout(r, 50));

    const subjects = sendEmail.mock.calls.map(([msg]) => msg.subject);
    expect(subjects.some(s => s.includes('New participant joined'))).toBe(true);

    const toAddresses = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(toAddresses).toContain(BASE_EVENT.organizer_email);
  });

  it('does NOT send organizer notification on re-registration with same email', async () => {
    const email = 'repeat-notify@example.com';

    // First registration
    await request(app).post(`/api/join/${joinToken}`).send({ email });
    await new Promise(r => setTimeout(r, 50));
    vi.clearAllMocks();

    // Second registration (same email)
    await request(app).post(`/api/join/${joinToken}`).send({ email });
    await new Promise(r => setTimeout(r, 50));

    const subjects = sendEmail.mock.calls.map(([msg]) => msg.subject);
    expect(subjects.some(s => s.includes('New participant joined'))).toBe(false);
  });
});

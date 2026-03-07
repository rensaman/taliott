/**
 * Integration tests for US 1.6 — Self-Registration via Shared Join Link
 * Tests GET /api/join/:joinToken and POST /api/join/:joinToken
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const BASE_EVENT = {
  name: 'Join Token Test',
  organizer_email: 'org@example.com',
  invite_mode: 'shared_link',
  date_range_start: '2025-09-01',
  date_range_end: '2025-09-01',
  part_of_day: 'morning',
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
});

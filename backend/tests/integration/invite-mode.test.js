/**
 * Integration tests for US 1.5 — Invite Mode Selection
 * Tests the invite_mode field on POST /api/events.
 */
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const BASE_BODY = {
  name: 'Invite Mode Test',
  organizer_email: 'org@example.com',
  date_range_start: '2025-09-01',
  date_range_end: '2025-09-01',
  part_of_day: 'morning',
  deadline: '2025-08-25T12:00:00.000Z',
};

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

describe('POST /api/events — invite_mode', () => {
  it('defaults to email_invites when invite_mode is omitted', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);
    expect(res.body.join_url).toBeUndefined();
  });

  it('with email_invites: creates participant rows and returns no join_url', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      invite_mode: 'email_invites',
      participant_emails: ['a@example.com', 'b@example.com'],
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);
    expect(res.body.participants.length).toBeGreaterThan(0);
    expect(res.body.join_url).toBeUndefined();
  });

  it('with shared_link: creates exactly 1 participant row (the organizer)', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      invite_mode: 'shared_link',
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);
    expect(res.body.participants).toHaveLength(1);
    expect(res.body.participants[0].email).toBe(BASE_BODY.organizer_email);
  });

  it('with shared_link: returns join_url in response', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      invite_mode: 'shared_link',
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);
    expect(res.body.join_url).toMatch(/\/join\/[0-9a-f-]{36}$/);
  });

  it('with shared_link: ignores participant_emails even if provided (only organizer enrolled)', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      invite_mode: 'shared_link',
      participant_emails: ['should-be-ignored@example.com'],
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);
    expect(res.body.participants).toHaveLength(1);
    expect(res.body.participants[0].email).toBe(BASE_BODY.organizer_email);
  });

  it('returns 400 for an invalid invite_mode value', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      invite_mode: 'carrier_pigeon',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invite_mode/i);
  });
});

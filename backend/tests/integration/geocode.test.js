/**
 * Integration tests for GET /api/geocode and PATCH /api/participate/:id/location (US 2.1)
 */
import { describe, it, expect, afterAll, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

const BASE_EVENT = {
  name: 'Location Test',
  organizer_email: 'geo@example.com',
  date_range_start: '2025-07-01',
  date_range_end: '2025-07-01',
  part_of_day: 'morning',
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
};

async function createEvent(overrides = {}) {
  const res = await request(app).post('/api/events').send({ ...BASE_EVENT, ...overrides });
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  return res.body;
}

describe('GET /api/geocode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { lat: '51.5074', lon: '-0.1278', display_name: 'London, Greater London, England, United Kingdom' },
      ],
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns mapped results for a valid query', async () => {
    const res = await request(app).get('/api/geocode?q=London');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0]).toMatchObject({ lat: 51.5074, lng: -0.1278 });
    expect(res.body[0].label).toBeDefined();
  });

  it('returns empty array when query is shorter than 3 characters', async () => {
    const res = await request(app).get('/api/geocode?q=Lo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns empty array when q is missing', async () => {
    const res = await request(app).get('/api/geocode');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('PATCH /api/participate/:id/location', () => {
  it('saves latitude, longitude, and address_label', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 51.5074, longitude: -0.1278, address_label: 'London, UK' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const updated = await prisma.participant.findUnique({ where: { id: pid } });
    expect(updated.latitude).toBeCloseTo(51.5074);
    expect(updated.longitude).toBeCloseTo(-0.1278);
    expect(updated.addressLabel).toBe('London, UK');
  });

  it('location is reflected in GET /api/participate/:id response', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 48.8566, longitude: 2.3522, address_label: 'Paris, France' });

    const res = await request(app).get(`/api/participate/${pid}`);
    expect(res.body.participant.latitude).toBeCloseTo(48.8566);
    expect(res.body.participant.longitude).toBeCloseTo(2.3522);
    expect(res.body.participant.address_label).toBe('Paris, France');
  });

  it('returns 400 for non-numeric coordinates', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 'not-a-number', longitude: 0 });

    expect(res.status).toBe(400);
  });

  it('returns 400 for out-of-range coordinates', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 999, longitude: 0 });

    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown participant', async () => {
    const res = await request(app)
      .patch('/api/participate/00000000-0000-0000-0000-000000000000/location')
      .send({ latitude: 51.5, longitude: -0.1 });

    expect(res.status).toBe(404);
  });

  it('returns 403 when event is locked', async () => {
    const { participants } = await createEvent({ deadline: '2020-01-01T00:00:00.000Z' });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 51.5, longitude: -0.1 });

    expect(res.status).toBe(403);
  });
});

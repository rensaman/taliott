/**
 * Integration tests for GET/PATCH /api/participate (US 1.2)
 * Requires the test DB: docker compose -f docker-compose.test.yml up -d
 */
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const PAST_DEADLINE = '2020-01-01T00:00:00.000Z';
const FUTURE_DEADLINE = '2099-12-31T23:59:59.000Z';

const BASE_EVENT = {
  name: 'Deadline Test',
  organizer_email: 'alex@example.com',
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-01',
  time_range_start: 480, time_range_end: 720,
  timezone: 'UTC',
  deadline: PAST_DEADLINE,
};

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

async function createEvent(overrides = {}) {
  const res = await request(app).post('/api/events').send({ ...BASE_EVENT, ...overrides });
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  return res.body;
}

describe('GET /api/participate/:participantId', () => {
  it('returns 404 for an unknown participant id', async () => {
    const res = await request(app).get('/api/participate/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns event name, participant, slots and availability', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).get(`/api/participate/${pid}`);

    expect(res.status).toBe(200);
    expect(res.body.event.name).toBe('Deadline Test');
    expect(res.body.participant.id).toBe(pid);
    expect(res.body.slots).toBeInstanceOf(Array);
    expect(res.body.availability).toBeInstanceOf(Array);
  });

  it('includes event.timezone in the response', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE, timezone: 'Europe/Budapest' });
    const pid = participants[0].id;

    const res = await request(app).get(`/api/participate/${pid}`);

    expect(res.status).toBe(200);
    expect(res.body.event.timezone).toBe('Europe/Budapest');
  });

  it('returns null name for a freshly created participant', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).get(`/api/participate/${pid}`);

    expect(res.status).toBe(200);
    expect(res.body.participant.name).toBeNull();
  });

  it('returns locked:true when deadline is in the past', async () => {
    const { participants } = await createEvent({ deadline: PAST_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).get(`/api/participate/${pid}`);

    expect(res.status).toBe(200);
    expect(res.body.event.locked).toBe(true);
  });

  it('returns participants array with id, name, responded_at, availability (no coordinates)', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).get(`/api/participate/${pid}`);

    expect(res.status).toBe(200);
    expect(res.body.participants).toBeInstanceOf(Array);
    expect(res.body.participants.length).toBeGreaterThan(0);
    const p = res.body.participants[0];
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('name');
    expect(p).not.toHaveProperty('latitude');
    expect(p).not.toHaveProperty('longitude');
    expect(p).toHaveProperty('responded_at');
    expect(p).toHaveProperty('availability');
    expect(p.availability).toBeInstanceOf(Array);
  });

  it('returns locked:false when deadline is in the future', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).get(`/api/participate/${pid}`);

    expect(res.status).toBe(200);
    expect(res.body.event.locked).toBe(false);
  });
});

describe('PATCH /api/participate/:participantId/availability', () => {
  it('returns 403 when event is locked (past deadline)', async () => {
    const { participants, slots } = await createEvent({ deadline: PAST_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ slot_id: slots[0].id, state: 'yes' }] });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/locked/i);
  });

  it('upserts availability and returns ok on an open event', async () => {
    const { participants, slots } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ slot_id: slots[0].id, state: 'yes' }] });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('persists the availability state so GET reflects it', async () => {
    const { participants, slots } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ slot_id: slots[0].id, state: 'maybe' }] });

    const res = await request(app).get(`/api/participate/${pid}`);
    const match = res.body.availability.find(a => a.slot_id === slots[0].id);
    expect(match?.state).toBe('maybe');
  });

  it('returns 400 for an invalid availability state', async () => {
    const { participants, slots } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ slot_id: slots[0].id, state: 'invalid' }] });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown participant id', async () => {
    const res = await request(app)
      .patch('/api/participate/00000000-0000-0000-0000-000000000000/availability')
      .send({ availability: [] });

    expect(res.status).toBe(404);
  });

  it('returns 400 when slot_id is missing', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ state: 'yes' }] });

    expect(res.status).toBe(400);
  });

  it('returns 400 when slot_id belongs to a different event', async () => {
    const event1 = await createEvent({ deadline: FUTURE_DEADLINE });
    const event2 = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = event1.participants[0].id;
    const foreignSlotId = event2.slots[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ slot_id: foreignSlotId, state: 'yes' }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not belong/i);
  });
});

describe('PATCH /api/participate/:participantId/name', () => {
  it('returns 404 for an unknown participant id', async () => {
    const res = await request(app)
      .patch('/api/participate/00000000-0000-0000-0000-000000000000/name')
      .send({ name: 'Alex' });
    expect(res.status).toBe(404);
  });

  it('saves the name and returns ok', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).patch(`/api/participate/${pid}/name`).send({ name: 'Jamie' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 when name is missing', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).patch(`/api/participate/${pid}/name`).send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when name is an empty string', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).patch(`/api/participate/${pid}/name`).send({ name: '   ' });

    expect(res.status).toBe(400);
  });

  it('returns 403 when event is locked', async () => {
    const { participants } = await createEvent({ deadline: PAST_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).patch(`/api/participate/${pid}/name`).send({ name: 'Alex' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/locked/i);
  });

  it('returns 400 when name exceeds 200 characters', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/name`)
      .send({ name: 'a'.repeat(201) });

    expect(res.status).toBe(400);
  });

  it('persists the name so GET reflects it', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    await request(app).patch(`/api/participate/${pid}/name`).send({ name: 'Sam' });
    const get = await request(app).get(`/api/participate/${pid}`);

    expect(get.body.participant.name).toBe('Sam');
  });
});

describe('PATCH /api/participate/:participantId/travel-mode', () => {
  it('returns 404 for an unknown participant id', async () => {
    const res = await request(app)
      .patch('/api/participate/00000000-0000-0000-0000-000000000000/travel-mode')
      .send({ travel_mode: 'driving' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid travel mode', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/travel-mode`)
      .send({ travel_mode: 'helicopter' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/travel_mode/i);
  });

  it('returns 403 when event is locked', async () => {
    const { participants } = await createEvent({ deadline: PAST_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/travel-mode`)
      .send({ travel_mode: 'cycling' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/locked/i);
  });

  it.each(['walking', 'cycling', 'driving', 'transit'])(
    'accepts valid travel mode "%s"',
    async (mode) => {
      const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
      const pid = participants[0].id;

      const res = await request(app)
        .patch(`/api/participate/${pid}/travel-mode`)
        .send({ travel_mode: mode });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    },
  );

  it('persists the travel mode so GET reflects it', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    await request(app)
      .patch(`/api/participate/${pid}/travel-mode`)
      .send({ travel_mode: 'cycling' });

    const get = await request(app).get(`/api/participate/${pid}`);
    expect(get.body.participant.travel_mode).toBe('cycling');
  });

  it('GET returns travel_mode with default value "transit"', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const get = await request(app).get(`/api/participate/${pid}`);
    expect(get.body.participant.travel_mode).toBe('transit');
  });
});

describe('PATCH /api/participate/:participantId/location', () => {
  it('returns 404 for an unknown participant id', async () => {
    const res = await request(app)
      .patch('/api/participate/00000000-0000-0000-0000-000000000000/location')
      .send({ latitude: 47.5, longitude: 19.0 });
    expect(res.status).toBe(404);
  });

  it('saves location and returns ok', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 47.5, longitude: 19.0, address_label: 'Budapest, Hungary' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('persists location so GET reflects it', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 47.5, longitude: 19.0, address_label: 'Budapest' });

    const get = await request(app).get(`/api/participate/${pid}`);
    expect(get.body.participant.latitude).toBeCloseTo(47.5);
    expect(get.body.participant.longitude).toBeCloseTo(19.0);
    expect(get.body.participant.address_label).toBe('Budapest');
  });

  it('returns 403 when event is locked', async () => {
    const { participants } = await createEvent({ deadline: PAST_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 47.5, longitude: 19.0 });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/locked/i);
  });

  it('returns 400 when latitude is missing', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ longitude: 19.0 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when latitude is out of range', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 91, longitude: 19.0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/range/i);
  });

  it('returns 400 when address_label exceeds 500 characters', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 47.5, longitude: 19.0, address_label: 'a'.repeat(501) });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/address_label/i);
  });

  it('accepts address_label of exactly 500 characters', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 47.5, longitude: 19.0, address_label: 'a'.repeat(500) });

    expect(res.status).toBe(200);
  });

  it('accepts null address_label', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 47.5, longitude: 19.0, address_label: null });

    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/participate/:participantId/confirm', () => {
  it('returns 404 for an unknown participant id', async () => {
    const res = await request(app).patch(
      '/api/participate/00000000-0000-0000-0000-000000000000/confirm'
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 when event is locked', async () => {
    const { participants } = await createEvent({ deadline: PAST_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).patch(`/api/participate/${pid}/confirm`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/locked/i);
  });

  it('sets responded_at and returns ok', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    const res = await request(app).patch(`/api/participate/${pid}/confirm`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const get = await request(app).get(`/api/participate/${pid}`);
    expect(get.body.participant.responded_at).toBeTruthy();
  });

  it('can be called again to update responded_at', async () => {
    const { participants } = await createEvent({ deadline: FUTURE_DEADLINE });
    const pid = participants[0].id;

    await request(app).patch(`/api/participate/${pid}/confirm`);
    const first = await request(app).get(`/api/participate/${pid}`);
    const firstTs = first.body.participant.responded_at;

    await new Promise(r => setTimeout(r, 10));

    await request(app).patch(`/api/participate/${pid}/confirm`);
    const second = await request(app).get(`/api/participate/${pid}`);
    const secondTs = second.body.participant.responded_at;

    expect(new Date(secondTs).getTime()).toBeGreaterThan(new Date(firstTs).getTime());
  });
});

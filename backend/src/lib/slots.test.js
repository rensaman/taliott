import { describe, it, expect } from 'vitest';
import { generateSlots, countDays } from './slots.js';

describe('generateSlots', () => {
  it('generates N × slotsPerDay for an N-day range', () => {
    // full range 480–1320 = 840 minutes / 30 = 28 slots/day
    const slotsPerDay = (1320 - 480) / 30;
    const slots = generateSlots('2025-01-01', '2025-01-03', 480, 1320, 'UTC');
    expect(slots).toHaveLength(3 * slotsPerDay);
  });

  it('generates slots for 1-day morning range (480-720)', () => {
    // 480 to 720 = 240 minutes / 30 = 8 slots
    const slots = generateSlots('2025-06-15', '2025-06-15', 480, 720, 'UTC');
    expect(slots).toHaveLength(8);
  });

  it('bounds slots to correct time range (UTC)', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 480, 720, 'UTC');
    // First slot starts at 08:00 UTC (480 minutes)
    const firstStart = slots[0].startsAt;
    expect(firstStart.getUTCHours()).toBe(8);
    expect(firstStart.getUTCMinutes()).toBe(0);
    // Last slot starts at 11:30 UTC (480 + 7*30 = 690 minutes)
    const lastStart = slots[slots.length - 1].startsAt;
    expect(lastStart.getUTCHours()).toBe(11);
    expect(lastStart.getUTCMinutes()).toBe(30);
  });

  it('each slot duration is exactly 30 minutes', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 480, 1320, 'UTC');
    for (const slot of slots) {
      expect(slot.endsAt - slot.startsAt).toBe(30 * 60 * 1000);
    }
  });

  it('handles a range crossing a month boundary (Jan 30 → Feb 1)', () => {
    // 480–720 = 8 slots/day
    const slots = generateSlots('2025-01-30', '2025-02-01', 480, 720, 'UTC');
    expect(slots).toHaveLength(3 * 8);
  });

  it('handles a range crossing a year boundary (Dec 31 → Jan 1)', () => {
    // full range 480–1320 = 28 slots/day
    const slots = generateSlots('2024-12-31', '2025-01-01', 480, 1320, 'UTC');
    expect(slots).toHaveLength(2 * 28);
  });

  it('falls back to defaults for no args', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01');
    expect(slots.length).toBeGreaterThan(0);
  });

  it('defaults to UTC when timezone is omitted', () => {
    const slotsDefault = generateSlots('2025-01-01', '2025-01-01');
    const slotsUTC = generateSlots('2025-01-01', '2025-01-01', 480, 1320, 'UTC');
    expect(slotsDefault).toHaveLength(slotsUTC.length);
  });

  it('returns Date objects for startsAt and endsAt', () => {
    const [slot] = generateSlots('2025-01-01', '2025-01-01', 480, 720, 'UTC');
    expect(slot.startsAt).toBeInstanceOf(Date);
    expect(slot.endsAt).toBeInstanceOf(Date);
  });

  it('slots are in chronological order', () => {
    const slots = generateSlots('2025-01-01', '2025-01-03', 480, 1320, 'UTC');
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].startsAt >= slots[i - 1].startsAt).toBe(true);
    }
  });

  it('generates slots in UTC correctly for Europe/Paris (UTC+2 in summer)', () => {
    // 2025-06-15 in Europe/Paris (CEST = UTC+2)
    // 08:00 Paris = 06:00 UTC, 08:30 Paris = 06:30 UTC
    const slots = generateSlots('2025-06-15', '2025-06-15', 480, 720, 'Europe/Paris');
    expect(slots[0].startsAt.getUTCHours()).toBe(6);   // 08:00 CEST → 06:00 UTC
    expect(slots[0].startsAt.getUTCMinutes()).toBe(0);
    expect(slots[0].endsAt.getUTCHours()).toBe(6);     // 08:30 CEST → 06:30 UTC
    expect(slots[0].endsAt.getUTCMinutes()).toBe(30);
  });

  it('generates slots in UTC correctly for America/New_York (UTC-4 in summer)', () => {
    // 2025-06-15 morning in America/New_York (EDT = UTC-4)
    // 08:00 EDT = 12:00 UTC
    const slots = generateSlots('2025-06-15', '2025-06-15', 480, 720, 'America/New_York');
    expect(slots[0].startsAt.getUTCHours()).toBe(12); // 08:00 EDT → 12:00 UTC
    expect(slots[0].startsAt.getUTCMinutes()).toBe(0);
  });
});

describe('countDays', () => {
  it('returns 1 for the same start and end date', () => {
    expect(countDays('2025-01-01', '2025-01-01')).toBe(1);
  });

  it('returns 3 for a 3-day range', () => {
    expect(countDays('2025-01-01', '2025-01-03')).toBe(3);
  });

  it('handles month boundary correctly', () => {
    expect(countDays('2025-01-30', '2025-02-01')).toBe(3);
  });
});

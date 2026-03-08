import { describe, it, expect } from 'vitest';
import { generateSlots, countDays, PART_OF_DAY_HOURS } from './slots.js';

describe('generateSlots', () => {
  it('generates N × hoursPerDay slots for an N-day range', () => {
    const hours = PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start;
    const slots = generateSlots('2025-01-01', '2025-01-03', 'all', 'UTC');
    expect(slots).toHaveLength(3 * hours);
  });

  it('generates exactly 1 day of slots for a 1-day range', () => {
    const hours = PART_OF_DAY_HOURS.morning.end - PART_OF_DAY_HOURS.morning.start;
    const slots = generateSlots('2025-06-15', '2025-06-15', 'morning', 'UTC');
    expect(slots).toHaveLength(hours);
  });

  it('bounds morning slots to correct UTC hour range when timezone is UTC', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'morning', 'UTC');
    const startHours = slots.map(s => s.startsAt.getUTCHours());
    expect(Math.min(...startHours)).toBe(PART_OF_DAY_HOURS.morning.start);
    expect(Math.max(...startHours)).toBe(PART_OF_DAY_HOURS.morning.end - 1);
  });

  it('bounds afternoon slots to correct UTC hour range when timezone is UTC', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'afternoon', 'UTC');
    const startHours = slots.map(s => s.startsAt.getUTCHours());
    expect(Math.min(...startHours)).toBe(PART_OF_DAY_HOURS.afternoon.start);
    expect(Math.max(...startHours)).toBe(PART_OF_DAY_HOURS.afternoon.end - 1);
  });

  it('bounds evening slots to correct UTC hour range when timezone is UTC', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'evening', 'UTC');
    const startHours = slots.map(s => s.startsAt.getUTCHours());
    expect(Math.min(...startHours)).toBe(PART_OF_DAY_HOURS.evening.start);
    expect(Math.max(...startHours)).toBe(PART_OF_DAY_HOURS.evening.end - 1);
  });

  it('each slot duration is exactly 1 hour', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'all', 'UTC');
    for (const slot of slots) {
      expect(slot.endsAt - slot.startsAt).toBe(60 * 60 * 1000);
    }
  });

  it('handles a range crossing a month boundary (Jan 30 → Feb 1)', () => {
    const hours = PART_OF_DAY_HOURS.morning.end - PART_OF_DAY_HOURS.morning.start;
    const slots = generateSlots('2025-01-30', '2025-02-01', 'morning', 'UTC');
    expect(slots).toHaveLength(3 * hours);
  });

  it('handles a range crossing a year boundary (Dec 31 → Jan 1)', () => {
    const hours = PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start;
    const slots = generateSlots('2024-12-31', '2025-01-01', 'all', 'UTC');
    expect(slots).toHaveLength(2 * hours);
  });

  it('falls back to "all" hours for an unknown partOfDay value', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'unknown', 'UTC');
    const allHours = PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start;
    expect(slots).toHaveLength(allHours);
  });

  it('defaults to UTC when timezone is omitted', () => {
    const slotsDefault = generateSlots('2025-01-01', '2025-01-01');
    const slotsUTC = generateSlots('2025-01-01', '2025-01-01', 'all', 'UTC');
    expect(slotsDefault).toHaveLength(slotsUTC.length);
  });

  it('returns Date objects for startsAt and endsAt', () => {
    const [slot] = generateSlots('2025-01-01', '2025-01-01', 'morning', 'UTC');
    expect(slot.startsAt).toBeInstanceOf(Date);
    expect(slot.endsAt).toBeInstanceOf(Date);
  });

  it('slots are in chronological order', () => {
    const slots = generateSlots('2025-01-01', '2025-01-03', 'all', 'UTC');
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].startsAt >= slots[i - 1].startsAt).toBe(true);
    }
  });

  it('generates slots in UTC correctly for Europe/Paris (UTC+2 in summer)', () => {
    // 2025-06-15 morning in Europe/Paris (CEST = UTC+2)
    // 08:00 Paris = 06:00 UTC
    const slots = generateSlots('2025-06-15', '2025-06-15', 'morning', 'Europe/Paris');
    expect(slots[0].startsAt.getUTCHours()).toBe(6); // 08:00 CEST → 06:00 UTC
    expect(slots[0].endsAt.getUTCHours()).toBe(7);   // 09:00 CEST → 07:00 UTC
  });

  it('generates slots in UTC correctly for America/New_York (UTC-4 in summer)', () => {
    // 2025-06-15 morning in America/New_York (EDT = UTC-4)
    // 08:00 EDT = 12:00 UTC
    const slots = generateSlots('2025-06-15', '2025-06-15', 'morning', 'America/New_York');
    expect(slots[0].startsAt.getUTCHours()).toBe(12); // 08:00 EDT → 12:00 UTC
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

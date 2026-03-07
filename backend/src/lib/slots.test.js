import { describe, it, expect } from 'vitest';
import { generateSlots, countDays, PART_OF_DAY_HOURS } from './slots.js';

describe('generateSlots', () => {
  it('generates N × hoursPerDay slots for an N-day range', () => {
    const hours = PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start;
    const slots = generateSlots('2025-01-01', '2025-01-03', 'all');
    expect(slots).toHaveLength(3 * hours);
  });

  it('generates exactly 1 day of slots for a 1-day range', () => {
    const hours = PART_OF_DAY_HOURS.morning.end - PART_OF_DAY_HOURS.morning.start;
    const slots = generateSlots('2025-06-15', '2025-06-15', 'morning');
    expect(slots).toHaveLength(hours);
  });

  it('bounds morning slots to correct hour range', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'morning');
    const startHours = slots.map(s => s.startsAt.getHours());
    expect(Math.min(...startHours)).toBe(PART_OF_DAY_HOURS.morning.start);
    expect(Math.max(...startHours)).toBe(PART_OF_DAY_HOURS.morning.end - 1);
  });

  it('bounds afternoon slots to correct hour range', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'afternoon');
    const startHours = slots.map(s => s.startsAt.getHours());
    expect(Math.min(...startHours)).toBe(PART_OF_DAY_HOURS.afternoon.start);
    expect(Math.max(...startHours)).toBe(PART_OF_DAY_HOURS.afternoon.end - 1);
  });

  it('bounds evening slots to correct hour range', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'evening');
    const startHours = slots.map(s => s.startsAt.getHours());
    expect(Math.min(...startHours)).toBe(PART_OF_DAY_HOURS.evening.start);
    expect(Math.max(...startHours)).toBe(PART_OF_DAY_HOURS.evening.end - 1);
  });

  it('each slot duration is exactly 1 hour', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'all');
    for (const slot of slots) {
      expect(slot.endsAt - slot.startsAt).toBe(60 * 60 * 1000);
    }
  });

  it('handles a range crossing a month boundary (Jan 30 → Feb 1)', () => {
    const hours = PART_OF_DAY_HOURS.morning.end - PART_OF_DAY_HOURS.morning.start;
    const slots = generateSlots('2025-01-30', '2025-02-01', 'morning');
    expect(slots).toHaveLength(3 * hours);
  });

  it('handles a range crossing a year boundary (Dec 31 → Jan 1)', () => {
    const hours = PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start;
    const slots = generateSlots('2024-12-31', '2025-01-01', 'all');
    expect(slots).toHaveLength(2 * hours);
  });

  it('falls back to "all" hours for an unknown partOfDay value', () => {
    const slots = generateSlots('2025-01-01', '2025-01-01', 'unknown');
    const allHours = PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start;
    expect(slots).toHaveLength(allHours);
  });

  it('defaults to "all" when partOfDay is omitted', () => {
    const slotsDefault = generateSlots('2025-01-01', '2025-01-01');
    const slotsAll = generateSlots('2025-01-01', '2025-01-01', 'all');
    expect(slotsDefault).toHaveLength(slotsAll.length);
  });

  it('returns Date objects for startsAt and endsAt', () => {
    const [slot] = generateSlots('2025-01-01', '2025-01-01', 'morning');
    expect(slot.startsAt).toBeInstanceOf(Date);
    expect(slot.endsAt).toBeInstanceOf(Date);
  });

  it('slots are in chronological order', () => {
    const slots = generateSlots('2025-01-01', '2025-01-03', 'all');
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].startsAt >= slots[i - 1].startsAt).toBe(true);
    }
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

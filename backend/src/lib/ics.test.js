import { describe, it, expect } from 'vitest';
import { generateICS } from './ics.js';

const slot = {
  startsAt: new Date('2025-06-15T09:00:00.000Z'),
  endsAt: new Date('2025-06-15T10:00:00.000Z'),
};

const venue = { name: 'The Anchor Pub', latitude: 51.5, longitude: -0.1 };

describe('generateICS', () => {
  it('returns a string', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(typeof ics).toBe('string');
  });

  it('contains BEGIN:VCALENDAR and END:VCALENDAR', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('contains BEGIN:VEVENT and END:VEVENT', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
  });

  it('contains correct DTSTART in UTC iCal format', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('DTSTART:20250615T090000Z');
  });

  it('contains correct DTEND in UTC iCal format', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('DTEND:20250615T100000Z');
  });

  it('contains SUMMARY with event name', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('SUMMARY:Summer Meetup');
  });

  it('contains LOCATION with venue name', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('LOCATION:The Anchor Pub');
  });

  it('omits LOCATION when no venue provided', () => {
    const ics = generateICS({ slot, venue: null, eventName: 'Summer Meetup' });
    expect(ics).not.toContain('LOCATION:');
  });

  it('contains a UID field', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toMatch(/UID:.+@taliott/);
  });

  it('contains VERSION:2.0', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('VERSION:2.0');
  });
});

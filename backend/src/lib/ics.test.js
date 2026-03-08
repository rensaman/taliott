import { describe, it, expect } from 'vitest';
import { generateICS } from './ics.js';

// Slot stored as UTC: 09:00–10:00 UTC on 2025-06-15
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

  it('DTSTART includes TZID matching the event timezone', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup', timezone: 'Europe/Paris' });
    expect(ics).toContain('DTSTART;TZID=Europe/Paris:');
  });

  it('DTEND includes TZID matching the event timezone', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup', timezone: 'Europe/Paris' });
    expect(ics).toContain('DTEND;TZID=Europe/Paris:');
  });

  it('DTSTART is expressed in local time (not UTC Z suffix) for UTC+2', () => {
    // slot 09:00 UTC = 11:00 Europe/Paris (CEST = UTC+2 on 2025-06-15)
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup', timezone: 'Europe/Paris' });
    expect(ics).toContain('DTSTART;TZID=Europe/Paris:20250615T110000');
    // DTSTART/DTEND should not end with Z (which would mean UTC floating time)
    expect(ics).not.toMatch(/DTSTART[^:]*:[0-9TZ]*Z/);
    expect(ics).not.toMatch(/DTEND[^:]*:[0-9TZ]*Z/);
  });

  it('DTSTART defaults to UTC timezone when timezone is omitted', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('DTSTART;TZID=UTC:20250615T090000');
  });

  it('contains SUMMARY with event name', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('SUMMARY:Summer Meetup');
  });

  it('contains LOCATION with venue name', () => {
    const ics = generateICS({ slot, venue, eventName: 'Summer Meetup' });
    expect(ics).toContain('LOCATION:The Anchor Pub');
  });

  it('includes address in LOCATION when venue has address', () => {
    const venueWithAddr = { name: 'The Pub', address: '10 Downing St' };
    const ics = generateICS({ slot, venue: venueWithAddr, eventName: 'Summer Meetup' });
    expect(ics).toContain('LOCATION:The Pub, 10 Downing St');
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

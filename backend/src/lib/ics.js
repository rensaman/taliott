import { randomUUID } from 'crypto';

/**
 * Formats a Date to iCal UTC datetime string: YYYYMMDDTHHMMSSZ
 * @param {Date} date
 * @returns {string}
 */
function toICalDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generates a valid iCal (.ics) string for a finalized event.
 * @param {{ slot: { startsAt: Date, endsAt: Date }, venue: { name: string }|null, eventName: string }} opts
 * @returns {string}
 */
export function generateICS({ slot, venue, eventName }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//taliott//taliott//EN',
    'BEGIN:VEVENT',
    `UID:${randomUUID()}@taliott`,
    `DTSTART:${toICalDate(new Date(slot.startsAt))}`,
    `DTEND:${toICalDate(new Date(slot.endsAt))}`,
    `SUMMARY:${eventName}`,
  ];

  if (venue?.name) {
    lines.push(`LOCATION:${venue.name}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

import { randomUUID } from 'crypto';

/**
 * Converts a UTC Date to a local iCal datetime string (YYYYMMDDTHHMMSS) in the
 * given IANA timezone.
 * @param {Date} date
 * @param {string} timezone
 * @returns {string}
 */
function toICalLocalDate(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(date));

  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const h = p.hour === '24' ? '00' : p.hour;
  return `${p.year}${p.month}${p.day}T${h}${p.minute}${p.second}`;
}

/**
 * Escapes text for use in an iCal property value (RFC 5545).
 * @param {string} text
 * @returns {string}
 */
function escapeICalText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generates a valid iCal (.ics) string for a finalized event.
 * DTSTART/DTEND include a TZID matching the event timezone.
 *
 * @param {{
 *   slot: { startsAt: Date, endsAt: Date },
 *   venue: { name: string, address?: string }|null,
 *   eventName: string,
 *   timezone?: string,
 *   durationMinutes?: number,
 *   notes?: string
 * }} opts
 * @returns {string}
 */
export function generateICS({ slot, venue, eventName, timezone = 'UTC', durationMinutes, notes }) {
  const startDate = new Date(slot.startsAt);
  const dtStart = toICalLocalDate(startDate, timezone);
  const endDate = durationMinutes
    ? new Date(startDate.getTime() + durationMinutes * 60 * 1000)
    : new Date(slot.endsAt);
  const dtEnd = toICalLocalDate(endDate, timezone);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//taliott//taliott//EN',
    'BEGIN:VEVENT',
    `UID:${randomUUID()}@taliott`,
    `DTSTART;TZID=${timezone}:${dtStart}`,
    `DTEND;TZID=${timezone}:${dtEnd}`,
    `SUMMARY:${eventName}`,
  ];

  const venueName = venue?.name;
  const venueAddress = venue?.address;
  if (venueName) {
    const location = venueAddress ? `${venueName}, ${venueAddress}` : venueName;
    lines.push(`LOCATION:${location}`);
  }

  if (notes) {
    lines.push(`DESCRIPTION:${escapeICalText(notes)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

export const PART_OF_DAY_HOURS = {
  morning:   { start: 8,  end: 12 },
  afternoon: { start: 12, end: 18 },
  evening:   { start: 18, end: 22 },
  all:       { start: 8,  end: 22 },
};

/**
 * Returns the UTC-minus-local offset in milliseconds at `date` for `timezone`.
 * Positive means UTC is ahead of local (e.g. UTC+2 → offset = -7200000).
 * @param {Date} date
 * @param {string} timezone  IANA timezone string
 * @returns {number}
 */
function getOffsetMs(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  // Intl may return '24' for midnight; normalise to '00'
  const h = p.hour === '24' ? '00' : p.hour;
  const localAsUTC = Date.parse(`${p.year}-${p.month}-${p.day}T${h}:${p.minute}:${p.second}Z`);
  return date.getTime() - localAsUTC;
}

/**
 * Converts a local hour on a given date in `timezone` to a UTC Date.
 * Uses a two-step refinement to handle DST transitions correctly.
 * @param {string} dateStr  ISO date string "YYYY-MM-DD"
 * @param {number} hour     0–23
 * @param {string} timezone IANA timezone string
 * @returns {Date}
 */
function localHourToUTC(dateStr, hour, timezone) {
  const naive = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00Z`);
  const offset1 = getOffsetMs(naive, timezone);
  const approx = new Date(naive.getTime() + offset1);
  const offset2 = getOffsetMs(approx, timezone);
  return new Date(naive.getTime() + offset2);
}

/**
 * Generate hourly Slot objects for every day in [dateRangeStart, dateRangeEnd]
 * bounded by the given partOfDay filter. Slot times are stored in UTC but
 * represent hours in the event's timezone.
 *
 * @param {string|Date} dateRangeStart
 * @param {string|Date} dateRangeEnd
 * @param {'morning'|'afternoon'|'evening'|'all'} partOfDay
 * @param {string} [timezone='UTC']  IANA timezone string
 * @returns {{ startsAt: Date, endsAt: Date }[]}
 */
export function generateSlots(dateRangeStart, dateRangeEnd, partOfDay = 'all', timezone = 'UTC') {
  const hours = PART_OF_DAY_HOURS[partOfDay] ?? PART_OF_DAY_HOURS.all;

  // Walk day-by-day using the date string so we're never affected by server TZ
  const startDate = typeof dateRangeStart === 'string'
    ? dateRangeStart
    : dateRangeStart.toISOString().slice(0, 10);
  const endDate = typeof dateRangeEnd === 'string'
    ? dateRangeEnd
    : dateRangeEnd.toISOString().slice(0, 10);

  const slots = [];

  // Iterate over days
  let current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    for (let h = hours.start; h < hours.end; h++) {
      const startsAt = localHourToUTC(dateStr, h, timezone);
      const endsAt = localHourToUTC(dateStr, h + 1, timezone);
      slots.push({ startsAt, endsAt });
    }
    current = new Date(current.getTime() + 86_400_000);
  }

  return slots;
}

/** Number of day columns for a given date range (inclusive). */
export function countDays(dateRangeStart, dateRangeEnd) {
  const start = new Date(dateRangeStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateRangeEnd);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / 86_400_000) + 1;
}

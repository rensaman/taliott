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
 * Converts local minutes-from-midnight on a given date in `timezone` to a UTC Date.
 * Uses a two-step refinement to handle DST transitions correctly.
 * @param {string} dateStr  ISO date string "YYYY-MM-DD"
 * @param {number} minutes  0–1439 (minutes from midnight)
 * @param {string} timezone IANA timezone string
 * @returns {Date}
 */
function localMinutesToUTC(dateStr, minutes, timezone) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const naive = new Date(
    `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`
  );
  const offset1 = getOffsetMs(naive, timezone);
  const approx = new Date(naive.getTime() + offset1);
  const offset2 = getOffsetMs(approx, timezone);
  return new Date(naive.getTime() + offset2);
}

/**
 * Generate 30-minute Slot objects for every day in [dateRangeStart, dateRangeEnd]
 * bounded by the given time range (minutes from midnight). Slot times are stored
 * in UTC but represent times in the event's timezone.
 *
 * @param {string|Date} dateRangeStart
 * @param {string|Date} dateRangeEnd
 * @param {number} [timeRangeStart=480]  start minutes from midnight (default 08:00)
 * @param {number} [timeRangeEnd=1320]   end minutes from midnight (default 22:00)
 * @param {string} [timezone='UTC']  IANA timezone string
 * @returns {{ startsAt: Date, endsAt: Date }[]}
 */
export function generateSlots(dateRangeStart, dateRangeEnd, timeRangeStart = 480, timeRangeEnd = 1320, timezone = 'UTC') {
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
    for (let m = timeRangeStart; m <= timeRangeEnd; m += 30) {
      const startsAt = localMinutesToUTC(dateStr, m, timezone);
      const endsAt = localMinutesToUTC(dateStr, m + 30, timezone);
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

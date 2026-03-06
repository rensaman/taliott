export const PART_OF_DAY_HOURS = {
  morning:   { start: 8,  end: 12 },
  afternoon: { start: 12, end: 18 },
  evening:   { start: 18, end: 22 },
  all:       { start: 8,  end: 22 },
};

/**
 * Generate hourly Slot objects for every day in [dateRangeStart, dateRangeEnd]
 * bounded by the given partOfDay filter.
 *
 * @param {string|Date} dateRangeStart
 * @param {string|Date} dateRangeEnd
 * @param {'morning'|'afternoon'|'evening'|'all'} partOfDay
 * @returns {{ startsAt: Date, endsAt: Date }[]}
 */
export function generateSlots(dateRangeStart, dateRangeEnd, partOfDay = 'all') {
  const hours = PART_OF_DAY_HOURS[partOfDay] ?? PART_OF_DAY_HOURS.all;

  const current = new Date(dateRangeStart);
  current.setHours(0, 0, 0, 0);

  const endDay = new Date(dateRangeEnd);
  endDay.setHours(0, 0, 0, 0);

  const slots = [];

  while (current <= endDay) {
    for (let h = hours.start; h < hours.end; h++) {
      const startsAt = new Date(current);
      startsAt.setHours(h, 0, 0, 0);

      const endsAt = new Date(current);
      endsAt.setHours(h + 1, 0, 0, 0);

      slots.push({ startsAt, endsAt });
    }
    current.setDate(current.getDate() + 1);
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

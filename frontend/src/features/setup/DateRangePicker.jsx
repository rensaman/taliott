import React, { useState } from 'react';
import './DateRangePicker.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-first ISO weekday: 0=Mon … 6=Sun
function getFirstWeekday(year, month) {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export default function DateRangePicker({ value, onChange }) {
  const { start, end } = value;
  const today = todayISO();

  const initDate = start ? new Date(start + 'T12:00:00') : new Date();
  const [displayYear, setDisplayYear] = useState(() => initDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(() => initDate.getMonth());
  const [hoverDate, setHoverDate] = useState(null);

  // Two-click flow: first click = start, second click = end
  const pickingEnd = !!(start && !end);

  // For hover preview while picking end
  const previewEnd = pickingEnd && hoverDate && hoverDate >= start ? hoverDate : end;

  function prevMonth() {
    if (displayMonth === 0) { setDisplayYear(y => y - 1); setDisplayMonth(11); }
    else setDisplayMonth(m => m - 1);
  }
  function nextMonth() {
    if (displayMonth === 11) { setDisplayYear(y => y + 1); setDisplayMonth(0); }
    else setDisplayMonth(m => m + 1);
  }

  function handleDayClick(iso) {
    if (!start || !pickingEnd) {
      // Start fresh: set start, clear end
      onChange({ start: iso, end: '' });
    } else {
      // Picking end
      if (iso < start) {
        // Clicked before start — reset with this as new start
        onChange({ start: iso, end: '' });
      } else {
        onChange({ start, end: iso });
      }
    }
  }

  const daysInMonth = getDaysInMonth(displayYear, displayMonth);
  const firstWeekday = getFirstWeekday(displayYear, displayMonth);

  function classFor(iso) {
    let cls = 'drp-cell';
    const isStart = iso === start;
    const isEnd = !!(previewEnd && iso === previewEnd && previewEnd !== start);
    const isSingle = isStart && iso === previewEnd;
    const inRange = !!(start && previewEnd && previewEnd > start && iso > start && iso < previewEnd);
    const isToday = iso === today;

    if (isSingle) return cls + ' drp-cell--single';
    if (isStart) cls += ' drp-cell--start';
    if (isEnd) cls += ' drp-cell--end';
    if (inRange) cls += ' drp-cell--range';
    if (isToday && !isStart && !isEnd) cls += ' drp-cell--today';
    return cls;
  }

  const statusText = !start
    ? 'Tap a start date'
    : !end
      ? `From ${fmtDate(start)} — tap an end date`
      : `${fmtDate(start)} – ${fmtDate(end)}`;

  return (
    <div className="drp">
      {/* Month navigation */}
      <div className="drp-nav">
        <button type="button" className="drp-nav-btn" onClick={prevMonth} aria-label="Previous month">‹</button>
        <span className="drp-month-label">{MONTHS[displayMonth]} {displayYear}</span>
        <button type="button" className="drp-nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
      </div>

      {/* Calendar grid */}
      <div className="drp-grid" role="grid" aria-label="Date picker">
        {WEEKDAYS.map(d => (
          <div key={d} className="drp-weekday" role="columnheader">{d}</div>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`e${i}`} className="drp-cell drp-cell--empty" role="gridcell" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const iso = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className={classFor(iso)}
              onClick={() => handleDayClick(iso)}
              onMouseEnter={() => pickingEnd && setHoverDate(iso)}
              onMouseLeave={() => pickingEnd && setHoverDate(null)}
              aria-label={iso}
            >
              <span className="drp-num">{d}</span>
            </button>
          );
        })}
      </div>

      {/* Status hint */}
      <p className="drp-status" aria-live="polite">{statusText}</p>

      {/* Sr-only hidden inputs — keep existing From/To label API for tests */}
      <input
        type="date"
        aria-label="From"
        data-testid="date-start"
        className="drp-sr-input"
        value={start}
        onChange={e => onChange({ ...value, start: e.target.value })}
        tabIndex={-1}
      />
      <input
        type="date"
        aria-label="To"
        data-testid="date-end"
        className="drp-sr-input"
        value={end}
        min={start || undefined}
        onChange={e => onChange({ ...value, end: e.target.value })}
        tabIndex={-1}
      />
    </div>
  );
}

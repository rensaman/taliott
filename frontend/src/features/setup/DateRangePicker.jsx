import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './DateRangePicker.css';

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

function fmtDate(iso, monthsShort) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${monthsShort[m - 1]} ${y}`;
}

export default function DateRangePicker({ value, onChange, singleDate = false }) {
  const { t } = useTranslation();
  const MONTHS = t('datepicker.months', { returnObjects: true });
  const MONTHS_SHORT = t('datepicker.monthsShort', { returnObjects: true });
  const WEEKDAYS = t('datepicker.weekdays', { returnObjects: true });

  const { start, end } = singleDate
    ? { start: value || '', end: value || '' }
    : (value || { start: '', end: '' });
  const today = todayISO();

  const initDate = start ? new Date(start + 'T12:00:00') : new Date();
  const [displayYear, setDisplayYear] = useState(() => initDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(() => initDate.getMonth());
  const [hoverDate, setHoverDate] = useState(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const pickingEnd = singleDate ? false : !!(start && !end);
  const previewEnd = pickingEnd && hoverDate && hoverDate >= start ? hoverDate : end;

  // Close on outside mousedown
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function prevMonth() {
    if (displayMonth === 0) { setDisplayYear(y => y - 1); setDisplayMonth(11); }
    else setDisplayMonth(m => m - 1);
  }
  function nextMonth() {
    if (displayMonth === 11) { setDisplayYear(y => y + 1); setDisplayMonth(0); }
    else setDisplayMonth(m => m + 1);
  }

  function navigateGrid(e) {
    const grid = e.currentTarget;
    const buttons = Array.from(grid.querySelectorAll('button[role="gridcell"]'));
    const focused = document.activeElement;
    const idx = buttons.indexOf(focused);
    if (idx === -1) return;

    let next = -1;
    if (e.key === 'ArrowRight') next = idx + 1;
    else if (e.key === 'ArrowLeft') next = idx - 1;
    else if (e.key === 'ArrowDown') next = idx + 7;
    else if (e.key === 'ArrowUp') next = idx - 7;
    else if (e.key === 'PageDown') { e.preventDefault(); nextMonth(); return; }
    else if (e.key === 'PageUp') { e.preventDefault(); prevMonth(); return; }
    else return;

    e.preventDefault();
    if (next >= 0 && next < buttons.length) buttons[next].focus();
  }

  function handleDayClick(iso) {
    if (iso < today) return;
    if (singleDate) {
      onChange(iso);
      setOpen(false);
      return;
    }
    if (!start || !pickingEnd) {
      onChange({ start: iso, end: '' });
    } else {
      if (iso < start) {
        onChange({ start: iso, end: '' });
      } else {
        onChange({ start, end: iso });
        setOpen(false);
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
    const isPast = iso < today;

    if (isPast) return cls + ' drp-cell--past';
    if (isSingle) return cls + ' drp-cell--single';
    if (isStart) cls += ' drp-cell--start';
    if (isEnd) cls += ' drp-cell--end';
    if (inRange) cls += ' drp-cell--range';
    if (isToday && !isStart && !isEnd) cls += ' drp-cell--today';
    return cls;
  }

  const hasValue = singleDate ? !!start : !!(start && end);
  const statusText = singleDate
    ? (start ? fmtDate(start, MONTHS_SHORT) : t('datepicker.pickDate'))
    : (!start
        ? t('datepicker.pickStart')
        : !end
          ? t('datepicker.pickEnd', { start: fmtDate(start, MONTHS_SHORT) })
          : t('datepicker.rangeStatus', { start: fmtDate(start, MONTHS_SHORT), end: fmtDate(end, MONTHS_SHORT) }));

  return (
    <div className="drp" ref={containerRef}>
      {/* Collapsed trigger — always visible */}
      <button
        type="button"
        className={`drp-trigger${hasValue ? ' drp-trigger--filled' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        data-testid="drp-trigger"
      >
        <span className="drp-trigger-text">{statusText}</span>
        <span className="drp-trigger-icon" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {/* Calendar panel — visible when open */}
      {open && (
        <div className="drp-panel">
          <div className="drp-nav">
            <button type="button" className="drp-nav-btn" onClick={prevMonth} aria-label={t('datepicker.prevMonth')}>‹</button>
            <span className="drp-month-label">{MONTHS[displayMonth]} {displayYear}</span>
            <button type="button" className="drp-nav-btn" onClick={nextMonth} aria-label={t('datepicker.nextMonth')}>›</button>
          </div>

          <div className="drp-grid" role="grid" aria-label={t('datepicker.gridLabel')} onKeyDown={navigateGrid}>
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
                  aria-disabled={iso < today || undefined}
                  tabIndex={iso < today ? -1 : 0}
                >
                  <span className="drp-num">{d}</span>
                </button>
              );
            })}
          </div>

          <p className="drp-status" aria-live="polite">{statusText}</p>
        </div>
      )}

      {/* Sr-only hidden inputs — always in DOM for tests/accessibility */}
      {singleDate ? (
        <input
          type="date"
          aria-label="Date"
          data-testid="date-value"
          className="drp-sr-input"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          tabIndex={-1}
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

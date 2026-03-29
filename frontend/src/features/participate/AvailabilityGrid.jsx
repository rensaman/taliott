import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import SlotCell from './SlotCell.jsx';
import SaveStatusIndicator from './SaveStatusIndicator.jsx';

const DEBOUNCE_MS = 600;

// Extract the day (YYYY-MM-DD) and time (minutes from midnight) in the event's timezone
function getSlotLocalParts(isoString, timeZone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(isoString));
  const get = type => parts.find(p => p.type === type).value;
  const dayKey = `${get('year')}-${get('month')}-${get('day')}`;
  const timeKey = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
  return { dayKey, timeKey };
}

// Group slots into { dayKey → { timeKey (minutes from midnight) → slot } }
function buildDayMap(slots, timeZone) {
  const dayMap = new Map();
  for (const slot of slots) {
    const { dayKey, timeKey } = getSlotLocalParts(slot.starts_at, timeZone);
    if (!dayMap.has(dayKey)) dayMap.set(dayKey, new Map());
    dayMap.get(dayKey).set(timeKey, slot);
  }
  return dayMap;
}

export default function AvailabilityGrid({ participantId, slots, initialAvailability, locked, eventTimezone = 'UTC' }) {
  const { i18n } = useTranslation();
  const [stateMap, setStateMap] = useState(() => {
    const map = {};
    for (const slot of slots) map[slot.id] = 'neutral';
    for (const a of initialAvailability) map[a.slot_id] = a.state;
    return map;
  });

  const [saveStatus, setSaveStatus] = useState('idle');
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  const flush = useCallback(async () => {
    const changes = pendingRef.current;
    if (Object.keys(changes).length === 0) return;
    pendingRef.current = {};
    try {
      const res = await fetch(`/api/participate/${participantId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability: Object.entries(changes).map(([slot_id, state]) => ({ slot_id, state })),
        }),
      });
      if (!res.ok) {
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch {
      setSaveStatus('error');
    }
  }, [participantId]);

  function handleCellClick(slotId, newState) {
    setStateMap(prev => ({ ...prev, [slotId]: newState }));
    pendingRef.current[slotId] = newState;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
  }

  const dayMap = buildDayMap(slots, eventTimezone);
  const days = [...dayMap.keys()].sort();
  const timeKeys = [...new Set(slots.map(s => getSlotLocalParts(s.starts_at, eventTimezone).timeKey))]
    .sort((a, b) => a - b);

  return (
    <section aria-label="Availability grid">
      <SaveStatusIndicator status={saveStatus} />
      <div className="rw-grid-scroll">
        <table className="rw-grid-table">
          <thead>
            <tr>
              <th scope="col" />
              {days.map(day => (
                <th key={day} scope="col">
                  {new Date(day + 'T12:00:00').toLocaleDateString(i18n.language, {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeKeys.map(tk => {
              const h = Math.floor(tk / 60);
              const m = tk % 60;
              const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              return (
                <tr key={tk}>
                  <th scope="row">{label}</th>
                  {days.map(day => {
                    const slot = dayMap.get(day)?.get(tk);
                    if (!slot) return <td key={day} />;
                    return (
                      <td key={day}>
                        <SlotCell
                          slotId={slot.id}
                          state={stateMap[slot.id] ?? 'neutral'}
                          onClick={handleCellClick}
                          disabled={locked}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

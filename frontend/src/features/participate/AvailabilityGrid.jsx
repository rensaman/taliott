import { useState, useRef, useCallback } from 'react';
import SlotCell from './SlotCell.jsx';
import SaveStatusIndicator from './SaveStatusIndicator.jsx';

const DEBOUNCE_MS = 600;

// Group slots into { dayKey → { timeKey (minutes from midnight) → slot } }
function buildDayMap(slots) {
  const dayMap = new Map();
  for (const slot of slots) {
    const d = new Date(slot.starts_at);
    const dayKey = d.toLocaleDateString('en-CA'); // YYYY-MM-DD, locale-independent
    const timeKey = d.getHours() * 60 + d.getMinutes();
    if (!dayMap.has(dayKey)) dayMap.set(dayKey, new Map());
    dayMap.get(dayKey).set(timeKey, slot);
  }
  return dayMap;
}

export default function AvailabilityGrid({ participantId, slots, initialAvailability, locked }) {
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
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/participate/${participantId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability: Object.entries(changes).map(([slot_id, state]) => ({ slot_id, state })),
        }),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
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

  const dayMap = buildDayMap(slots);
  const days = [...dayMap.keys()].sort();
  const timeKeys = [...new Set(slots.map(s => {
    const d = new Date(s.starts_at);
    return d.getHours() * 60 + d.getMinutes();
  }))].sort((a, b) => a - b);

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
                  {new Date(day + 'T12:00:00').toLocaleDateString(undefined, {
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

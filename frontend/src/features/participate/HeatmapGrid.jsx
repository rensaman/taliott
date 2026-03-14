/**
 * HeatmapGrid — read-only overlay showing group yes_count per slot.
 * Color intensity: white (0 yes) → green (all yes).
 */

function buildDayTimeMap(slots) {
  const map = new Map();
  for (const slot of slots) {
    const d = new Date(slot.starts_at);
    const dayKey = d.toLocaleDateString('en-CA');
    const timeKey = d.getHours() * 60 + d.getMinutes();
    if (!map.has(dayKey)) map.set(dayKey, new Map());
    map.get(dayKey).set(timeKey, slot.id);
  }
  return map;
}

function cellStyle(yesCount, total) {
  if (total === 0) return {};
  const intensity = yesCount / total;
  // rgba green: transparent at 0, solid at 1
  return { backgroundColor: `rgba(39, 174, 96, ${intensity.toFixed(2)})` };
}

export default function HeatmapGrid({ slots, heatmap }) {
  if (!heatmap || heatmap.slots.length === 0) return null;

  const { total_participants: total, slots: heatmapSlots } = heatmap;
  const yesMap = new Map(heatmapSlots.map(s => [s.slot_id, s.yes_count]));

  const dayMap = buildDayTimeMap(slots);
  const days = [...dayMap.keys()].sort();
  const timeKeys = [...new Set(slots.map(s => {
    const d = new Date(s.starts_at);
    return d.getHours() * 60 + d.getMinutes();
  }))].sort((a, b) => a - b);

  return (
    <section aria-label="Group availability heatmap">
      <h2>Group availability</h2>
      <table>
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
                const slotId = dayMap.get(day)?.get(tk);
                if (!slotId) return <td key={day} />;
                const yesCount = yesMap.get(slotId) ?? 0;
                return (
                  <td
                    key={day}
                    style={cellStyle(yesCount, total)}
                    aria-label={`${yesCount} of ${total} yes`}
                    data-testid="heatmap-cell"
                  >
                    {yesCount}/{total}
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

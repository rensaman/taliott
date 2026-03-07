export const STATE_CYCLE = ['neutral', 'yes', 'maybe', 'no'];

export function nextAvailabilityState(current) {
  const idx = STATE_CYCLE.indexOf(current);
  const safeIdx = idx === -1 ? 0 : idx; // treat unknown as neutral
  return STATE_CYCLE[(safeIdx + 1) % STATE_CYCLE.length];
}

const STATE_LABEL = { neutral: '–', yes: '✓', maybe: '?', no: '✗' };
const STATE_CLASS = {
  neutral: 'slot-neutral',
  yes:     'slot-yes',
  maybe:   'slot-maybe',
  no:      'slot-no',
};

export default function SlotCell({ slotId, state = 'neutral', onClick, disabled }) {
  return (
    <button
      type="button"
      data-testid="slot-cell"
      data-state={state}
      className={STATE_CLASS[state] ?? STATE_CLASS.neutral}
      aria-label={`Availability: ${state}`}
      aria-pressed={state !== 'neutral'}
      disabled={disabled}
      onClick={() => onClick(slotId, nextAvailabilityState(state))}
    >
      {STATE_LABEL[state] ?? '–'}
    </button>
  );
}

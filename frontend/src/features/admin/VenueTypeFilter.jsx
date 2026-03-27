import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const PRIMARY_TYPES = ['restaurant', 'pub', 'cafe'];
const EXTENDED_TYPES = ['bar', 'biergarten', 'fast_food', 'food_court', 'ice_cream', 'nightclub', 'cinema', 'theatre', 'library', 'community_centre'];
const KNOWN_TYPES = new Set([...PRIMARY_TYPES, ...EXTENDED_TYPES]);

export default function VenueTypeFilter({ defaultValue, onSearch }) {
  const { t } = useTranslation();
  const initLower = defaultValue?.trim().toLowerCase() || '';
  const isExtended = initLower && EXTENDED_TYPES.includes(initLower);

  const extraChip = initLower && !KNOWN_TYPES.has(initLower) ? initLower : null;

  const [selected, setSelected] = useState(() =>
    initLower ? new Set([initLower]) : new Set()
  );
  const [expanded, setExpanded] = useState(isExtended);

  function toggle(value) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(next);
    onSearch([...next]);
  }

  function label(value) {
    return t(`venueTypeFilter.types.${value}`, { defaultValue: value });
  }

  function Chip({ value }) {
    return (
      <button
        type="button"
        className={`venue-type-chip${selected.has(value) ? ' venue-type-chip--active' : ''}`}
        onClick={() => toggle(value)}
      >
        {label(value)}
      </button>
    );
  }

  return (
    <div data-testid="venue-type-filter" className="venue-type-filter">
      <div className="venue-type-chips">
        {PRIMARY_TYPES.map(v => <Chip key={v} value={v} />)}
        {extraChip && <Chip value={extraChip} />}
      </div>
      {expanded && (
        <div className="venue-type-chips venue-type-chips--extended">
          {EXTENDED_TYPES.map(v => <Chip key={v} value={v} />)}
        </div>
      )}
      <button
        type="button"
        className="venue-type-toggle"
        onClick={() => setExpanded(prev => !prev)}
      >
        {expanded ? t('venueTypeFilter.showLess') : t('venueTypeFilter.showMore')}
      </button>
    </div>
  );
}

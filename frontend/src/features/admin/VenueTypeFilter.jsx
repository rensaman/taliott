import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const PRESET_TYPES = ['Restaurant', 'Bar', 'Cafe', 'Pub', 'Park', 'Museum'];
const PRESET_LOWER_SET = new Set(PRESET_TYPES.map(t => t.toLowerCase()));

export default function VenueTypeFilter({ defaultValue, onSearch }) {
  const { t } = useTranslation();
  const initLower = defaultValue?.trim().toLowerCase() || '';
  const [selected, setSelected] = useState(() =>
    initLower ? new Set([initLower]) : new Set()
  );
  const [extraTypes, setExtraTypes] = useState(() =>
    initLower && !PRESET_LOWER_SET.has(initLower) ? [initLower] : []
  );
  const [customInput, setCustomInput] = useState('');

  function toggle(lower) {
    const next = new Set(selected);
    if (next.has(lower)) next.delete(lower);
    else next.add(lower);
    setSelected(next);
    onSearch([...next]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const lower = customInput.trim().toLowerCase();
    if (!lower) return;
    if (!PRESET_LOWER_SET.has(lower) && !extraTypes.includes(lower)) {
      setExtraTypes(prev => [...prev, lower]);
    }
    toggle(lower);
    setCustomInput('');
  }

  return (
    <form onSubmit={handleSubmit} data-testid="venue-type-filter">
      <div className="venue-type-chips">
        {PRESET_TYPES.map(type => (
          <button
            key={type}
            type="button"
            className={`venue-type-chip${selected.has(type.toLowerCase()) ? ' venue-type-chip--active' : ''}`}
            onClick={() => toggle(type.toLowerCase())}
          >
            {type}
          </button>
        ))}
        {extraTypes.map(type => (
          <button
            key={type}
            type="button"
            className={`venue-type-chip${selected.has(type) ? ' venue-type-chip--active' : ''}`}
            onClick={() => toggle(type)}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="venue-filter-custom">
        <input
          id="venue-type-input"
          type="text"
          className="venue-filter-input"
          data-testid="venue-type-input"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          placeholder={t('venueTypeFilter.placeholder')}
          aria-label={t('venueTypeFilter.ariaLabel')}
        />
        <button type="submit" className="venue-filter-btn" data-testid="venue-search-btn">{t('venueTypeFilter.searchBtn')}</button>
      </div>
    </form>
  );
}

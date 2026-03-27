import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const PRESET_TYPES = ['Restaurant', 'Bar', 'Cafe', 'Pub', 'Park', 'Museum'];
const PRESET_LOWER_SET = new Set(PRESET_TYPES.map(t => t.toLowerCase()));

export default function VenueTypeFilter({ defaultValue, onSearch }) {
  const { t } = useTranslation();
  const initLower = defaultValue?.trim().toLowerCase() || '';

  // Non-preset defaultValue gets a single extra chip; custom searches never become chips
  const extraChip = initLower && !PRESET_LOWER_SET.has(initLower) ? initLower : null;

  const [selected, setSelected] = useState(() =>
    initLower ? new Set([initLower]) : new Set()
  );
  const [customInput, setCustomInput] = useState('');

  function toggle(lower) {
    const next = new Set(selected);
    if (next.has(lower)) next.delete(lower);
    else next.add(lower);
    setSelected(next);
    setCustomInput('');
    onSearch([...next]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const lower = customInput.trim().toLowerCase();
    if (!lower) return;
    setSelected(new Set());
    setCustomInput(lower);
    onSearch([lower]);
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
        {extraChip && (
          <button
            type="button"
            className={`venue-type-chip${selected.has(extraChip) ? ' venue-type-chip--active' : ''}`}
            onClick={() => toggle(extraChip)}
          >
            {extraChip}
          </button>
        )}
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

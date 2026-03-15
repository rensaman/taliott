import { useState } from 'react';

const PRESET_TYPES = ['Restaurant', 'Bar', 'Cafe', 'Pub', 'Park', 'Museum'];

export default function VenueTypeFilter({ defaultValue, onSearch }) {
  const [value, setValue] = useState(defaultValue || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }

  function handleChip(type) {
    const lower = type.toLowerCase();
    setValue(lower);
    onSearch(lower);
  }

  return (
    <form onSubmit={handleSubmit} data-testid="venue-type-filter">
      <div className="venue-type-chips">
        {PRESET_TYPES.map(type => (
          <button
            key={type}
            type="button"
            className={`venue-type-chip${value.toLowerCase() === type.toLowerCase() ? ' venue-type-chip--active' : ''}`}
            onClick={() => handleChip(type)}
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
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="or search your own type…"
          aria-label="Venue type"
        />
        <button type="submit" className="venue-filter-btn">Search</button>
      </div>
    </form>
  );
}

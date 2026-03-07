import { useState } from 'react';

export default function VenueTypeFilter({ defaultValue, onSearch }) {
  const [value, setValue] = useState(defaultValue || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} data-testid="venue-type-filter">
      <label htmlFor="venue-type-input">Venue type</label>
      {' '}
      <input
        id="venue-type-input"
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="e.g. restaurant, bar, cafe"
      />
      {' '}
      <button type="submit">Search</button>
    </form>
  );
}

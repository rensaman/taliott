import { useState, useEffect } from 'react';
import { useDebounce } from '../../lib/useDebounce.js';

export default function AddressSearchInput({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/geocode?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(setResults)
      .catch(err => { if (err.name !== 'AbortError') setResults([]); });
    return () => controller.abort();
  }, [debouncedQuery]);

  function handleSelect(result) {
    setQuery(result.label);
    setResults([]);
    onSelect(result);
  }

  return (
    <div>
      <label htmlFor="address-search" className="rw-address-label">Search address</label>
      <input
        id="address-search"
        className="rw-address-input"
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type your address…"
        autoComplete="off"
      />
      <small className="rw-address-hint">
        Your location is used only to calculate a fair meeting point. Coordinates may be processed
        by OpenRouteService to estimate travel times. See our{' '}
        <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
      </small>
      {results.length > 0 && (
        <ul className="rw-address-results" role="listbox" aria-label="Address suggestions">
          {results.map((r, i) => (
            <li key={i} role="option">
              <button type="button" onClick={() => handleSelect(r)}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

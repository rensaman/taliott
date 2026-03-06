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
      <label htmlFor="address-search">Search address</label>
      <input
        id="address-search"
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type your address…"
        autoComplete="off"
      />
      {results.length > 0 && (
        <ul role="listbox" aria-label="Address suggestions">
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

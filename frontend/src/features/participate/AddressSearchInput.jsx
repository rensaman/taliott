import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../../lib/useDebounce.js';
import { privacyPath } from '../../lib/legalPaths.js';

export default function AddressSearchInput({ onSelect }) {
  const { t, i18n } = useTranslation();
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
      <label htmlFor="address-search" className="rw-address-label">{t('participate.location.searchLabel')}</label>
      <input
        id="address-search"
        className="rw-address-input"
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('participate.location.searchPlaceholder')}
        autoComplete="off"
      />
      <small className="rw-address-hint">
        {t('participate.location.hintBefore')}
        <a href={privacyPath(i18n.language)} target="_blank" rel="noreferrer">{t('participate.location.hintPrivacy')}</a>.
      </small>
      {results.length > 0 && (
        <ul className="rw-address-results" role="listbox" aria-label={t('participate.location.suggestions')}>
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

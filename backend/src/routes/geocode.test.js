import { describe, it, expect } from 'vitest';
import { mapNominatimResult } from './geocode.js';

describe('mapNominatimResult', () => {
  it('maps lat and lon strings to numeric lat/lng', () => {
    const result = mapNominatimResult({ lat: '51.5074', lon: '-0.1278', display_name: 'London, UK' });
    expect(result.lat).toBe(51.5074);
    expect(result.lng).toBe(-0.1278);
  });

  it('maps display_name to label', () => {
    const result = mapNominatimResult({ lat: '0', lon: '0', display_name: 'London, UK' });
    expect(result.label).toBe('London, UK');
  });

  it('returns exactly {lat, lng, label}', () => {
    const result = mapNominatimResult({ lat: '1', lon: '2', display_name: 'Place' });
    expect(Object.keys(result)).toEqual(['lat', 'lng', 'label']);
  });
});

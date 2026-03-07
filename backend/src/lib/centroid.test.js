import { describe, it, expect } from 'vitest';
import { computeCentroid } from './centroid.js';

describe('computeCentroid', () => {
  it('returns arithmetic mean lat/lng for two points', () => {
    const result = computeCentroid([
      { latitude: 0, longitude: 0 },
      { latitude: 2, longitude: 2 },
    ]);
    expect(result.lat).toBe(1);
    expect(result.lng).toBe(1);
  });

  it('returns the single point when only one participant has a location', () => {
    const result = computeCentroid([
      { latitude: 51.5, longitude: -0.1 },
    ]);
    expect(result.lat).toBe(51.5);
    expect(result.lng).toBe(-0.1);
  });

  it('excludes participants missing lat/lng', () => {
    const result = computeCentroid([
      { latitude: 0, longitude: 0 },
      { latitude: null, longitude: null },
      { latitude: 2, longitude: 2 },
    ]);
    expect(result.lat).toBe(1);
    expect(result.lng).toBe(1);
    expect(result.count).toBe(2);
  });

  it('excludes participants with only one coordinate set', () => {
    const result = computeCentroid([
      { latitude: 0, longitude: 0 },
      { latitude: 4, longitude: null },
    ]);
    expect(result.lat).toBe(0);
    expect(result.lng).toBe(0);
    expect(result.count).toBe(1);
  });

  it('returns null when no participants have a location', () => {
    const result = computeCentroid([
      { latitude: null, longitude: null },
      { latitude: null, longitude: null },
    ]);
    expect(result).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(computeCentroid([])).toBeNull();
  });

  it('includes count of participants used in calculation', () => {
    const result = computeCentroid([
      { latitude: 1, longitude: 1 },
      { latitude: 3, longitude: 3 },
      { latitude: null, longitude: null },
    ]);
    expect(result.count).toBe(2);
  });
});

import { describe, it, expect } from 'vitest';
import { localizeTimezone } from './localizeTimezone.js';

describe('localizeTimezone', () => {
  it('returns unchanged for EN', () => {
    expect(localizeTimezone('Europe/Budapest', 'en')).toBe('Europe/Budapest');
  });
  it('replaces Europe with Európa for HU', () => {
    expect(localizeTimezone('Europe/Budapest', 'hu')).toBe('Európa/Budapest');
  });
  it('replaces America for HU', () => {
    expect(localizeTimezone('America/New_York', 'hu')).toBe('Amerika/New_York');
  });
  it('leaves unknown region unchanged for HU', () => {
    expect(localizeTimezone('Unknown/City', 'hu')).toBe('Unknown/City');
  });
  it('returns tz unchanged when no slash', () => {
    expect(localizeTimezone('UTC', 'hu')).toBe('UTC');
  });
});

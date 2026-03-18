import { describe, it, expect } from 'vitest';
import { privacyPath, termsPath } from './legalPaths.js';

describe('privacyPath', () => {
  it('returns /privacy for EN', () => expect(privacyPath('en')).toBe('/privacy'));
  it('returns /privacy/hu for HU', () => expect(privacyPath('hu')).toBe('/privacy/hu'));
  it('falls back to /privacy for unknown lang', () => expect(privacyPath('fr')).toBe('/privacy'));
});

describe('termsPath', () => {
  it('returns /terms for EN', () => expect(termsPath('en')).toBe('/terms'));
  it('returns /terms/hu for HU', () => expect(termsPath('hu')).toBe('/terms/hu'));
  it('falls back to /terms for unknown lang', () => expect(termsPath('fr')).toBe('/terms'));
});

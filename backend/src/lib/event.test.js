import { describe, it, expect } from 'vitest';
import { isEventLocked } from './event.js';

describe('isEventLocked', () => {
  it('returns true when deadline is in the past', () => {
    const past = new Date(Date.now() - 1_000).toISOString();
    expect(isEventLocked({ deadline: past })).toBe(true);
  });

  it('returns false when deadline is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isEventLocked({ deadline: future })).toBe(false);
  });

  it('accepts a Date object', () => {
    expect(isEventLocked({ deadline: new Date(Date.now() - 1_000) })).toBe(true);
  });

  it('returns false for a far-future deadline', () => {
    expect(isEventLocked({ deadline: '2099-12-31T23:59:59Z' })).toBe(false);
  });
});

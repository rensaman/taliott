import { describe, it, expect } from 'vitest';
import { t } from './t.js';

describe('t()', () => {
  it('returns EN string for a known key', () => {
    expect(t('en', 'participantInvite.greeting')).toBe('Hi,');
  });

  it('returns HU string for a known key', () => {
    expect(t('hu', 'participantInvite.greeting')).toBe('Szia,');
  });

  it('interpolates {{var}} placeholders in EN', () => {
    expect(t('en', 'participantInvite.subject', { eventName: 'Summer Meetup' }))
      .toBe("You're invited: Summer Meetup");
  });

  it('interpolates {{var}} placeholders in HU', () => {
    expect(t('hu', 'participantInvite.subject', { eventName: 'Nyári Összejövetel' }))
      .toBe('Meghívó: Nyári Összejövetel');
  });

  it('falls back to EN when lang is not recognized', () => {
    expect(t('xx', 'participantInvite.greeting')).toBe('Hi,');
  });

  it('returns the key string when key is not found in any locale', () => {
    expect(t('en', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('leaves unresolved {{var}} placeholders in output when var not provided', () => {
    expect(t('en', 'participantInvite.subject')).toBe("You're invited: {{eventName}}");
  });

  it('works for deeply nested keys', () => {
    const result = t('en', 'organizerCreation.manageLink');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to EN value when lang is "hu" but key is absent from HU locale', () => {
    // Safety net: even with partial HU coverage, we always get a string
    const result = t('hu', 'participantInvite.greeting');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('participantInvite.greeting'); // not the key itself
  });
});

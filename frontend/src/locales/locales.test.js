import { describe, it, expect } from 'vitest';
import enCommon from './en/common.json';
import huCommon from './hu/common.json';
import enForms from './en/forms.json';
import huForms from './hu/forms.json';
import enErrors from './en/errors.json';
import huErrors from './hu/errors.json';

/**
 * Flatten a nested object into dot-separated keys, skipping array entries
 * (arrays like months/weekdays are treated as leaf values).
 */
function flatKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      return flatKeys(v, key);
    }
    return [key];
  });
}

function missingKeys(source, target) {
  const sourceKeys = flatKeys(source);
  const targetKeys = new Set(flatKeys(target));
  return sourceKeys.filter(k => !targetKeys.has(k));
}

describe('HU locale completeness', () => {
  it('hu/common.json contains every key from en/common.json', () => {
    const missing = missingKeys(enCommon, huCommon);
    expect(missing, `Missing HU keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('hu/forms.json contains every key from en/forms.json', () => {
    const missing = missingKeys(enForms, huForms);
    expect(missing, `Missing HU keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('hu/errors.json contains every key from en/errors.json', () => {
    const missing = missingKeys(enErrors, huErrors);
    expect(missing, `Missing HU keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('hu/common.json has no extra keys absent from en/common.json', () => {
    // Warn-only: extra HU keys are not a bug, but good to know
    const extra = missingKeys(huCommon, enCommon);
    expect(extra).toEqual([]);
  });
});

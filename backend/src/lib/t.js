import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '../../locales');

const cache = {};

function loadLocale(lang) {
  if (cache[lang] !== undefined) return cache[lang];
  try {
    const raw = readFileSync(join(LOCALES_DIR, lang, 'emails.json'), 'utf-8');
    cache[lang] = JSON.parse(raw);
    return cache[lang];
  } catch {
    cache[lang] = null;
    return null;
  }
}

function resolve(obj, keys) {
  return keys.reduce((cur, k) => (cur != null && typeof cur === 'object' ? cur[k] : undefined), obj);
}

function interpolate(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{{${key}}}`));
}

/**
 * Translate an email string key for the given language.
 * Falls back to 'en' if lang is unrecognised or key is missing.
 * Returns the key itself if not found in any locale.
 *
 * @param {string} lang - e.g. 'en' | 'hu'
 * @param {string} key  - dot-separated path e.g. 'participantInvite.subject'
 * @param {Record<string, string>} [vars] - interpolation variables
 */
export function t(lang, key, vars = {}) {
  const keys = key.split('.');

  let locale = loadLocale(lang);
  let val = locale ? resolve(locale, keys) : undefined;

  if (typeof val !== 'string' && lang !== 'en') {
    locale = loadLocale('en');
    val = locale ? resolve(locale, keys) : undefined;
  }

  if (typeof val !== 'string') return key;
  return interpolate(val, vars);
}

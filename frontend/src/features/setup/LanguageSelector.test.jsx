import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LanguageSelector from './LanguageSelector.jsx';
import i18n from '../../i18n.js';

function setPathname(path) {
  Object.defineProperty(window, 'location', {
    value: { pathname: path, href: '' },
    writable: true,
    configurable: true,
  });
}

describe('LanguageSelector', () => {
  it('renders EN and HU buttons', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /^EN$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^HU$/i })).toBeInTheDocument();
  });

  it('EN button has aria-pressed=true by default', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /^EN$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^HU$/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking HU changes the active state', async () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /^HU$/i }));
    expect(screen.getByRole('button', { name: /^HU$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^EN$/i })).toHaveAttribute('aria-pressed', 'false');
    // Reset language back to EN for other tests
    await i18n.changeLanguage('en');
  });
});

describe('LanguageSelector — localStorage persistence', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await i18n.changeLanguage('en');
  });

  it('stores "hu" in localStorage when HU is clicked', () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /^HU$/i }));
    expect(mockStorage.setItem).toHaveBeenCalledWith('taliott_lang', 'hu');
  });

  it('stores "en" in localStorage when EN is clicked', async () => {
    await i18n.changeLanguage('hu');
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /^EN$/i }));
    expect(mockStorage.setItem).toHaveBeenCalledWith('taliott_lang', 'en');
  });
});

describe('LanguageSelector — legal pages', () => {
  afterEach(() => {
    setPathname('/');
  });

  it('marks EN active on /privacy', () => {
    setPathname('/privacy');
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /^EN$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^HU$/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks HU active on /privacy/hu', () => {
    setPathname('/privacy/hu');
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /^HU$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^EN$/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('navigates to /privacy/hu when HU is clicked on /privacy', () => {
    setPathname('/privacy');
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /^HU$/i }));
    expect(window.location.href).toBe('/privacy/hu');
  });

  it('navigates to /privacy when EN is clicked on /privacy/hu', () => {
    setPathname('/privacy/hu');
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /^EN$/i }));
    expect(window.location.href).toBe('/privacy');
  });

  it('navigates to /terms/hu when HU is clicked on /terms', () => {
    setPathname('/terms');
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /^HU$/i }));
    expect(window.location.href).toBe('/terms/hu');
  });

  it('navigates to /terms when EN is clicked on /terms/hu', () => {
    setPathname('/terms/hu');
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button', { name: /^EN$/i }));
    expect(window.location.href).toBe('/terms');
  });
});

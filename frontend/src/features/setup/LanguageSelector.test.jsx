import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LanguageSelector from './LanguageSelector.jsx';
import i18n from '../../i18n.js';

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

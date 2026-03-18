import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import LegalFooter from './LegalFooter.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

describe('LegalFooter', () => {
  it('renders a link to the privacy policy', () => {
    render(<LegalFooter />);
    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/privacy');
  });

  it('renders a link to the terms of service', () => {
    render(<LegalFooter />);
    const link = screen.getByRole('link', { name: /terms/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/terms');
  });
});

describe('LegalFooter — language-aware links', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('links to /privacy/hu and /terms/hu when language is hu', async () => {
    await i18n.changeLanguage('hu');
    render(<LegalFooter />);
    expect(screen.getByRole('link', { name: /adatvédelmi/i })).toHaveAttribute('href', '/privacy/hu');
    expect(screen.getByRole('link', { name: /szerződési/i })).toHaveAttribute('href', '/terms/hu');
  });
});

describe('i18n', () => {
  afterEach(() => {
    i18n.removeResourceBundle('en', 'common');
    i18n.addResourceBundle('en', 'common', enCommon, true, true);
  });

  it('uses i18n for the privacy policy link text', () => {
    i18n.addResourceBundle('en', 'common', { legalFooter: { privacy: '__PRIVACY_TEST__' } }, true, true);
    render(<LegalFooter />);
    expect(screen.getByRole('link', { name: '__PRIVACY_TEST__' })).toBeInTheDocument();
  });
});

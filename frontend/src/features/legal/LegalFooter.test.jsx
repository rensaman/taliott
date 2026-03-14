import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LegalFooter from './LegalFooter.jsx';

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

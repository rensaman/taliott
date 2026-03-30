import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TermsView from './TermsView.jsx';

describe('TermsView', () => {
  it('renders the Terms of Service heading', () => {
    render(<TermsView />);
    expect(screen.getByRole('heading', { name: /terms of service/i, level: 1 })).toBeInTheDocument();
  });

  it('renders key sections', () => {
    render(<TermsView />);
    expect(screen.getByRole('heading', { name: /acceptance/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /organiser responsibilities/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /acceptable use/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /limitation of liability/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /governing law/i })).toBeInTheDocument();
  });

  it('shows the fallback contact email when env var is not set', () => {
    render(<TermsView />);
    expect(screen.getAllByText(/privacy@example\.com/i).length).toBeGreaterThan(0);
  });

  // UI-3: back navigation
  it('has a back navigation button', () => {
    render(<TermsView />);
    expect(screen.getByTestId('legal-back-btn')).toBeInTheDocument();
  });

  // UI-2: language toggle to HU
  it('has a link to the Hungarian version', () => {
    render(<TermsView />);
    const langLink = screen.getByTestId('legal-lang-link');
    expect(langLink).toHaveAttribute('href', '/terms/hu');
    expect(langLink).toHaveTextContent('HU');
  });
});

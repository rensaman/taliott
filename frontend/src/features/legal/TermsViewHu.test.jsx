import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TermsViewHu from './TermsViewHu.jsx';

describe('TermsViewHu', () => {
  it('renders the Hungarian Terms of Service heading', () => {
    render(<TermsViewHu />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /általános szerződési feltételek/i
    );
  });

  it('renders key sections in Hungarian', () => {
    render(<TermsViewHu />);
    expect(screen.getByRole('heading', { name: /feltételek elfogadása/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /szervező felelőssége/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /elfogadható használat/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /felelősség korlátozása/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /irányadó jog/i })).toBeInTheDocument();
  });

  it('shows the fallback contact email when env var is not set', () => {
    render(<TermsViewHu />);
    expect(screen.getAllByText(/privacy@example\.com/i).length).toBeGreaterThan(0);
  });

  it('renders the wordmark', () => {
    render(<TermsViewHu />);
    expect(screen.getByText('taliott')).toBeInTheDocument();
  });

  it('has a footer with privacy and terms links', () => {
    render(<TermsViewHu />);
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
  });
});

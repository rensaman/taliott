import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PrivacyPolicyViewHu from './PrivacyPolicyViewHu.jsx';

describe('PrivacyPolicyViewHu', () => {
  it('renders the Hungarian Privacy Policy heading', () => {
    render(<PrivacyPolicyViewHu />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/adatvédelmi tájékoztató/i);
  });

  it('renders required GDPR sections in Hungarian', () => {
    render(<PrivacyPolicyViewHu />);
    expect(screen.getByRole('heading', { name: /kik vagyunk/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /milyen személyes adatokat/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /az adatkezelés jogalapja/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /kivel osztjuk meg/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /adatmegőrzés/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /jogaid/i })).toBeInTheDocument();
  });

  it('shows the fallback contact email when env var is not set', () => {
    render(<PrivacyPolicyViewHu />);
    expect(screen.getAllByText(/privacy@example\.com/i).length).toBeGreaterThan(0);
  });

  it('renders the wordmark linking to home', () => {
    render(<PrivacyPolicyViewHu />);
    expect(screen.getByText('taliott')).toBeInTheDocument();
  });

  it('has a footer with privacy and terms links', () => {
    render(<PrivacyPolicyViewHu />);
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
  });

  // UI-3: back navigation
  it('has a back navigation button', () => {
    render(<PrivacyPolicyViewHu />);
    expect(screen.getByTestId('legal-back-btn')).toBeInTheDocument();
  });

  // UI-2: language toggle
  it('renders the language selector with EN and HU buttons', () => {
    render(<PrivacyPolicyViewHu />);
    expect(screen.getByRole('button', { name: /^EN$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^HU$/i })).toBeInTheDocument();
  });
});

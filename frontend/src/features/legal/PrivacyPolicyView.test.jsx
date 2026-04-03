import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PrivacyPolicyView from './PrivacyPolicyView.jsx';

describe('PrivacyPolicyView', () => {
  it('renders the Privacy Policy heading', () => {
    render(<PrivacyPolicyView />);
    expect(screen.getByRole('heading', { name: /privacy policy/i, level: 1 })).toBeInTheDocument();
  });

  it('renders all required GDPR sections', () => {
    render(<PrivacyPolicyView />);
    expect(screen.getByRole('heading', { name: /who we are/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what personal data/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /legal basis/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /who we share/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /retention/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your rights/i })).toBeInTheDocument();
  });

  it('shows the fallback contact email when env var is not set', () => {
    render(<PrivacyPolicyView />);
    expect(screen.getAllByText(/privacy@example\.com/i).length).toBeGreaterThan(0);
  });

  // UI-3: back navigation
  it('has a back navigation button', () => {
    render(<PrivacyPolicyView />);
    expect(screen.getByTestId('legal-back-btn')).toBeInTheDocument();
  });

  // UI-2: language toggle
  it('renders the language selector with EN and HU buttons', () => {
    render(<PrivacyPolicyView />);
    expect(screen.getByRole('button', { name: /^EN$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^HU$/i })).toBeInTheDocument();
  });
});

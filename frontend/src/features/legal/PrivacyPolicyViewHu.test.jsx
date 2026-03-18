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

  it('links back to the home page', () => {
    render(<PrivacyPolicyViewHu />);
    expect(screen.getByRole('link', { name: /vissza/i })).toHaveAttribute('href', '/');
  });

  it('links to the Hungarian terms page', () => {
    render(<PrivacyPolicyViewHu />);
    expect(
      screen.getByRole('link', { name: /általános szerződési feltételek/i })
    ).toHaveAttribute('href', '/terms/hu');
  });
});

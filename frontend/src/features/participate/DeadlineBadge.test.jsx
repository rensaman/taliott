import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DeadlineBadge from './DeadlineBadge.jsx';

describe('DeadlineBadge', () => {
  it('shows "Voting closed" when locked', () => {
    render(<DeadlineBadge deadline="2020-01-01T12:00:00Z" locked={true} />);
    expect(screen.getByText(/voting closed/i)).toBeInTheDocument();
  });

  it('shows "Voting deadline" when not locked', () => {
    render(<DeadlineBadge deadline="2099-01-01T12:00:00Z" locked={false} />);
    expect(screen.getByText(/voting deadline/i)).toBeInTheDocument();
  });

  it('displays the formatted deadline in both states', () => {
    const { rerender } = render(<DeadlineBadge deadline="2025-06-01T12:00:00Z" locked={false} />);
    expect(screen.getByText(/voting deadline/i)).toBeInTheDocument();

    rerender(<DeadlineBadge deadline="2025-06-01T12:00:00Z" locked={true} />);
    expect(screen.getByText(/voting closed/i)).toBeInTheDocument();
  });
});

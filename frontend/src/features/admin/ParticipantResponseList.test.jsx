import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ParticipantResponseList from './ParticipantResponseList.jsx';

const PARTICIPANTS = [
  { id: 'p-1', email: 'alex@example.com', responded_at: '2025-01-01T10:00:00Z' },
  { id: 'p-2', email: 'jamie@example.com', responded_at: null },
  { id: 'p-3', email: 'sam@example.com', responded_at: null },
];

describe('ParticipantResponseList', () => {
  it('renders all participant emails', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
  });

  it('marks responded participants', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    const responded = screen.getByTestId('participant-p-1');
    expect(responded).toHaveAttribute('data-responded', 'true');
  });

  it('marks pending participants', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    expect(screen.getByTestId('participant-p-2')).toHaveAttribute('data-responded', 'false');
    expect(screen.getByTestId('participant-p-3')).toHaveAttribute('data-responded', 'false');
  });

  it('shows a responded indicator for responded participants', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    expect(screen.getAllByText(/responded/i).length).toBeGreaterThan(0);
  });

  it('shows a pending indicator for non-responded participants', () => {
    render(<ParticipantResponseList participants={PARTICIPANTS} />);
    expect(screen.getAllByText(/pending/i).length).toBe(2);
  });
});

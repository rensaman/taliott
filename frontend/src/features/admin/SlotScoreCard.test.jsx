import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SlotScoreCard from './SlotScoreCard.jsx';

const SLOT_NO_DATA = {
  id: 'slot-1',
  starts_at: '2025-06-15T09:00:00.000Z',
  ends_at: '2025-06-15T10:00:00.000Z',
  respondedCount: 0,
  yes: 0, maybe: 0, no: 0,
};

const SLOT_WITH_DATA = {
  id: 'slot-2',
  starts_at: '2025-06-15T10:00:00.000Z',
  ends_at: '2025-06-15T11:00:00.000Z',
  respondedCount: 3,
  yes: 2, maybe: 1, no: 0,
};

describe('SlotScoreCard', () => {
  it('renders with correct data-testid', () => {
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={1} selected={false} onClick={() => {}} />);
    expect(screen.getByTestId('slot-card-slot-1')).toBeInTheDocument();
  });

  it('shows the rank', () => {
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={3} selected={false} onClick={() => {}} />);
    expect(screen.getByTestId('slot-card-slot-1')).toHaveTextContent('#3');
  });

  it('does not show vote bars when respondedCount is 0', () => {
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={1} selected={false} onClick={() => {}} />);
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\?/)).not.toBeInTheDocument();
    expect(screen.queryByText(/✗/)).not.toBeInTheDocument();
  });

  it('shows yes/maybe/no bars when respondedCount > 0', () => {
    render(<SlotScoreCard slot={SLOT_WITH_DATA} rank={1} selected={false} onClick={() => {}} />);
    expect(screen.getByText(/✓ 2/)).toBeInTheDocument();
    expect(screen.getByText(/\? 1/)).toBeInTheDocument();
    expect(screen.getByText(/✗ 0/)).toBeInTheDocument();
  });

  it('applies selected class when selected is true', () => {
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={1} selected={true} onClick={() => {}} />);
    expect(screen.getByTestId('slot-card-slot-1')).toHaveClass('slot-score-card--selected');
  });

  it('does not apply selected class when selected is false', () => {
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={1} selected={false} onClick={() => {}} />);
    expect(screen.getByTestId('slot-card-slot-1')).not.toHaveClass('slot-score-card--selected');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={1} selected={false} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter is pressed', () => {
    const onClick = vi.fn();
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={1} selected={false} onClick={onClick} />);
    fireEvent.keyDown(screen.getByTestId('slot-card-slot-1'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space is pressed', () => {
    const onClick = vi.fn();
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={1} selected={false} onClick={onClick} />);
    fireEvent.keyDown(screen.getByTestId('slot-card-slot-1'), { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onClick is undefined and card is clicked', () => {
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={1} selected={false} />);
    expect(() => fireEvent.click(screen.getByTestId('slot-card-slot-1'))).not.toThrow();
  });

  it('passes i18n.language as locale to date formatting', () => {
    const spy = vi.spyOn(Date.prototype, 'toLocaleDateString');
    render(<SlotScoreCard slot={SLOT_NO_DATA} rank={1} selected={false} onClick={() => {}} />);
    expect(spy).toHaveBeenCalledWith('en', expect.objectContaining({ weekday: 'short' }));
    spy.mockRestore();
  });
});

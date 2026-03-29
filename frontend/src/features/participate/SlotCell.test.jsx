import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SlotCell, { nextAvailabilityState, STATE_CYCLE } from './SlotCell.jsx';

describe('nextAvailabilityState', () => {
  it('cycles neutral → yes → maybe → no → neutral', () => {
    expect(nextAvailabilityState('neutral')).toBe('yes');
    expect(nextAvailabilityState('yes')).toBe('maybe');
    expect(nextAvailabilityState('maybe')).toBe('no');
    expect(nextAvailabilityState('no')).toBe('neutral');
  });

  it('treats unknown state as neutral and returns yes', () => {
    expect(nextAvailabilityState('unknown')).toBe('yes');
  });

  it('covers all states in STATE_CYCLE exactly once before repeating', () => {
    let state = 'neutral';
    const visited = new Set();
    for (let i = 0; i < STATE_CYCLE.length; i++) {
      state = nextAvailabilityState(state);
      visited.add(state);
    }
    expect(visited.size).toBe(STATE_CYCLE.length);
  });
});

describe('SlotCell', () => {
  it('renders the correct label for each state', () => {
    const { rerender } = render(<SlotCell slotId="s1" state="neutral" onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('');

    rerender(<SlotCell slotId="s1" state="yes" onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('✓');

    rerender(<SlotCell slotId="s1" state="maybe" onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('?');

    rerender(<SlotCell slotId="s1" state="no" onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('✗');
  });

  it('calls onClick with slotId and next state on click', async () => {
    const onClick = vi.fn();
    render(<SlotCell slotId="s1" state="neutral" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith('s1', 'yes');
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<SlotCell slotId="s1" state="neutral" onClick={onClick} disabled />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('sets data-state attribute to current state', () => {
    render(<SlotCell slotId="s1" state="yes" onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'yes');
  });
});

describe('SlotCell — keyboard shortcuts', () => {
  it('pressing y calls onClick with "yes"', () => {
    const onClick = vi.fn();
    render(<SlotCell slotId="s1" state="neutral" onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'y' });
    expect(onClick).toHaveBeenCalledWith('s1', 'yes');
  });

  it('pressing m calls onClick with "maybe"', () => {
    const onClick = vi.fn();
    render(<SlotCell slotId="s1" state="neutral" onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'm' });
    expect(onClick).toHaveBeenCalledWith('s1', 'maybe');
  });

  it('pressing n calls onClick with "no"', () => {
    const onClick = vi.fn();
    render(<SlotCell slotId="s1" state="neutral" onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'n' });
    expect(onClick).toHaveBeenCalledWith('s1', 'no');
  });

  it('pressing uppercase Y also works', () => {
    const onClick = vi.fn();
    render(<SlotCell slotId="s1" state="neutral" onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Y' });
    expect(onClick).toHaveBeenCalledWith('s1', 'yes');
  });

  it('does not call onClick for unrelated keys', () => {
    const onClick = vi.fn();
    render(<SlotCell slotId="s1" state="neutral" onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'a' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<SlotCell slotId="s1" state="neutral" onClick={onClick} disabled />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'y' });
    expect(onClick).not.toHaveBeenCalled();
  });
});

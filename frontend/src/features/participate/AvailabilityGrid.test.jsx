import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AvailabilityGrid from './AvailabilityGrid.jsx';

const SLOTS = [
  { id: 's1', starts_at: '2025-10-01T08:00:00.000Z', ends_at: '2025-10-01T09:00:00.000Z' },
  { id: 's2', starts_at: '2025-10-01T09:00:00.000Z', ends_at: '2025-10-01T10:00:00.000Z' },
  { id: 's3', starts_at: '2025-10-02T08:00:00.000Z', ends_at: '2025-10-02T09:00:00.000Z' },
];

function renderGrid(overrides = {}) {
  return render(
    <AvailabilityGrid
      participantId="p1"
      slots={SLOTS}
      initialAvailability={[]}
      locked={false}
      {...overrides}
    />
  );
}

describe('AvailabilityGrid', () => {
  beforeEach(() => {
    // shouldAdvanceTime: true lets waitFor's polling work alongside manual advances
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders one slot cell per slot', () => {
    renderGrid();
    expect(screen.getAllByTestId('slot-cell')).toHaveLength(SLOTS.length);
  });

  it('initialises cells from initialAvailability', () => {
    renderGrid({ initialAvailability: [{ slot_id: 's1', state: 'yes' }] });
    const cells = screen.getAllByTestId('slot-cell');
    expect(cells[0]).toHaveAttribute('data-state', 'yes');
  });

  it('cycles cell state on click', () => {
    renderGrid();
    const cells = screen.getAllByTestId('slot-cell');
    expect(cells[0]).toHaveAttribute('data-state', 'neutral');
    fireEvent.click(cells[0]);
    expect(cells[0]).toHaveAttribute('data-state', 'yes');
    fireEvent.click(cells[0]);
    expect(cells[0]).toHaveAttribute('data-state', 'maybe');
  });

  it('debounces save — multiple rapid clicks produce one fetch call', async () => {
    renderGrid();
    const cells = screen.getAllByTestId('slot-cell');
    // Grid renders row-first: row 0 = [s1(day1,h8), s3(day2,h8)], row 1 = [s2(day1,h9)]
    // cells[0]=s1, cells[1]=s3, cells[2]=s2
    fireEvent.click(cells[0]); // s1: neutral → yes
    fireEvent.click(cells[2]); // s2: neutral → yes
    fireEvent.click(cells[0]); // s1: yes → maybe

    // Timer not fired yet — no fetch
    expect(fetch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.availability).toHaveLength(2); // s1 and s2, not three calls
    expect(body.availability).toContainEqual({ slot_id: 's1', state: 'maybe' });
    expect(body.availability).toContainEqual({ slot_id: 's2', state: 'yes' });
  });


  it('shows error status when fetch fails', async () => {
    fetch.mockResolvedValue({ ok: false });
    renderGrid();
    fireEvent.click(screen.getAllByTestId('slot-cell')[0]);
    vi.advanceTimersByTime(600);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to save')
    );
  });

  it('shows error status when fetch throws a network error', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    renderGrid();
    fireEvent.click(screen.getAllByTestId('slot-cell')[0]);
    vi.advanceTimersByTime(600);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to save')
    );
  });

  it('disables all cells when locked', () => {
    renderGrid({ locked: true });
    for (const cell of screen.getAllByTestId('slot-cell')) {
      expect(cell).toBeDisabled();
    }
  });
});

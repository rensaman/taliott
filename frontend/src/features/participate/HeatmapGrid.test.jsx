import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeatmapGrid from './HeatmapGrid.jsx';

const SLOTS = [
  { id: 's-1', starts_at: '2025-06-01T08:00:00Z', ends_at: '2025-06-01T09:00:00Z' },
  { id: 's-2', starts_at: '2025-06-02T08:00:00Z', ends_at: '2025-06-02T09:00:00Z' },
];

const HEATMAP = {
  total_participants: 3,
  slots: [
    { slot_id: 's-1', yes_count: 2 },
    { slot_id: 's-2', yes_count: 0 },
  ],
};

describe('HeatmapGrid', () => {
  it('renders nothing when heatmap is null', () => {
    const { container } = render(<HeatmapGrid slots={SLOTS} heatmap={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when heatmap has no slots', () => {
    const { container } = render(
      <HeatmapGrid slots={SLOTS} heatmap={{ total_participants: 0, slots: [] }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a cell for each slot', () => {
    render(<HeatmapGrid slots={SLOTS} heatmap={HEATMAP} />);
    const cells = screen.getAllByTestId('heatmap-cell');
    expect(cells).toHaveLength(2);
  });

  it('shows yes_count / total in each cell', () => {
    render(<HeatmapGrid slots={SLOTS} heatmap={HEATMAP} />);
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('cell aria-label describes yes count and total', () => {
    render(<HeatmapGrid slots={SLOTS} heatmap={HEATMAP} />);
    expect(screen.getByLabelText('2 of 3 yes')).toBeInTheDocument();
  });

  it('applies green background proportional to intensity', () => {
    render(<HeatmapGrid slots={SLOTS} heatmap={HEATMAP} />);
    const cells = screen.getAllByTestId('heatmap-cell');
    // s-1: intensity = 2/3 ≈ 0.67 — should have non-transparent background
    expect(cells[0].style.backgroundColor).toContain('rgba(39, 174, 96');
    // s-2: intensity = 0 — background should be transparent (browser normalizes 0.00 → 0)
    expect(cells[1].style.backgroundColor).toMatch(/rgba\(39, 174, 96, 0(\.0+)?\)/);
  });

  it('renders the group availability heading', () => {
    render(<HeatmapGrid slots={SLOTS} heatmap={HEATMAP} />);
    expect(screen.getByRole('heading', { name: /group availability/i })).toBeInTheDocument();
  });
});

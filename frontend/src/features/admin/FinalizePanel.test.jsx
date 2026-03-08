import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FinalizePanel from './FinalizePanel.jsx';

const SLOTS = [
  { id: 'slot-1', starts_at: '2025-06-15T09:00:00.000Z', ends_at: '2025-06-15T10:00:00.000Z' },
  { id: 'slot-2', starts_at: '2025-06-15T10:00:00.000Z', ends_at: '2025-06-15T11:00:00.000Z' },
];

const VENUES = [
  { id: 'v1', name: 'The Anchor Pub', distanceM: 300 },
  { id: 'v2', name: 'Cafe Bistro', distanceM: 500 },
];

describe('FinalizePanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the finalize panel section', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={[]} />);
    expect(screen.getByTestId('finalize-panel')).toBeInTheDocument();
  });

  it('renders slot options', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={[]} />);
    expect(screen.getByRole('option', { name: /choose a slot/i })).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(3); // placeholder + 2 slots
  });

  it('renders venue mode radio buttons', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={[]} />);
    expect(screen.getByRole('radio', { name: /select recommended/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /enter custom venue/i })).toBeInTheDocument();
  });

  it('shows recommended venue select when venues are provided and mode is recommended', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={VENUES} />);
    expect(screen.getByRole('combobox', { name: /select venue/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /The Anchor Pub/i })).toBeInTheDocument();
  });

  it('hides recommended venue select when no venues provided', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={[]} />);
    expect(screen.queryByRole('combobox', { name: /select venue/i })).not.toBeInTheDocument();
  });

  it('shows custom venue inputs when custom mode is selected', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={VENUES} />);
    fireEvent.click(screen.getByRole('radio', { name: /enter custom venue/i }));
    expect(screen.getByTestId('custom-venue-name')).toBeInTheDocument();
    expect(screen.getByTestId('custom-venue-address')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /select venue/i })).not.toBeInTheDocument();
  });

  it('finalize button is disabled when no slot selected', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={[]} />);
    expect(screen.getByRole('button', { name: /finalize/i })).toBeDisabled();
  });

  it('finalize button is enabled after slot is selected', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={[]} />);
    fireEvent.change(screen.getByLabelText(/time slot/i), { target: { value: 'slot-1' } });
    expect(screen.getByRole('button', { name: /finalize/i })).not.toBeDisabled();
  });

  it('calls POST /api/events/:adminToken/finalize with slot_id on submit', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });
    const onFinalized = vi.fn();

    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={[]} onFinalized={onFinalized} />);
    fireEvent.change(screen.getByLabelText(/time slot/i), { target: { value: 'slot-1' } });
    fireEvent.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/events/tok/finalize',
      expect.objectContaining({ method: 'POST' })
    ));
    expect(onFinalized).toHaveBeenCalled();
  });

  it('submits venue_name and venue_address when custom venue mode is used', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={[]} />);
    fireEvent.change(screen.getByLabelText(/time slot/i), { target: { value: 'slot-1' } });
    fireEvent.click(screen.getByRole('radio', { name: /enter custom venue/i }));
    fireEvent.change(screen.getByTestId('custom-venue-name'), { target: { value: 'The Blue Note' } });
    fireEvent.change(screen.getByTestId('custom-venue-address'), { target: { value: '131 W 3rd St' } });
    fireEvent.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => {
      const [, options] = fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.venue_name).toBe('The Blue Note');
      expect(body.venue_address).toBe('131 W 3rd St');
      expect(body.venue_id).toBeUndefined();
    });
  });

  it('shows error message when finalization fails', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Event is already finalized' }),
    });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} venues={[]} />);
    fireEvent.change(screen.getByLabelText(/time slot/i), { target: { value: 'slot-1' } });
    fireEvent.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Event is already finalized')
    );
  });
});

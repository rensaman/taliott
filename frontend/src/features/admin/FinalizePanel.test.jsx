import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FinalizePanel from './FinalizePanel.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

const SLOTS = [
  { id: 'slot-1', starts_at: '2025-06-15T09:00:00.000Z', ends_at: '2025-06-15T10:00:00.000Z' },
  { id: 'slot-2', starts_at: '2025-06-15T10:00:00.000Z', ends_at: '2025-06-15T11:00:00.000Z' },
];

describe('FinalizePanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the finalize panel section', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByTestId('finalize-panel')).toBeInTheDocument();
  });

  it('renders slot cards', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByTestId('slot-card-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('slot-card-slot-2')).toBeInTheDocument();
  });

  it('renders venue mode radio buttons', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByRole('radio', { name: /select recommended/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /enter custom venue/i })).toBeInTheDocument();
  });

  it('shows selected venue name when one is provided', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} selectedVenueId="v1" selectedVenueName="The Anchor Pub" />);
    expect(screen.getByTestId('selected-venue-display')).toHaveTextContent('The Anchor Pub');
  });

  it('shows no-venue prompt when no venue is selected in recommended mode', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByTestId('selected-venue-display')).toHaveTextContent(/no venue selected/i);
  });

  it('shows custom venue inputs when custom mode is selected', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByRole('radio', { name: /enter custom venue/i }));
    expect(screen.getByTestId('custom-venue-name')).toBeInTheDocument();
    expect(screen.getByTestId('custom-venue-address')).toBeInTheDocument();
    expect(screen.queryByTestId('selected-venue-display')).not.toBeInTheDocument();
  });

  it('finalize button is disabled when no slot selected', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByRole('button', { name: /finalize/i })).toBeDisabled();
  });

  it('finalize button is enabled after slot is selected', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    expect(screen.getByRole('button', { name: /finalize/i })).not.toBeDisabled();
  });

  it('calls POST /api/events/:adminToken/finalize with slot_id on submit', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });
    const onFinalized = vi.fn();

    render(<FinalizePanel adminToken="tok" slots={SLOTS} onFinalized={onFinalized} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/events/tok/finalize',
      expect.objectContaining({ method: 'POST' })
    ));
    expect(onFinalized).toHaveBeenCalled();
  });

  it('submits venue_id when a recommended venue is selected', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} selectedVenueId="v1" selectedVenueName="The Anchor Pub" />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => {
      const [, options] = fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.venue_id).toBe('v1');
    });
  });

  it('submits venue_name and venue_address when custom venue mode is used', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
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

    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Event is already finalized')
    );
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the heading', () => {
      i18n.addResourceBundle('en', 'common', { finalize: { heading: '__FINALIZE_HEADING_TEST__' } }, true, true);
      render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('__FINALIZE_HEADING_TEST__');
    });

    it('passes i18n.language as locale to slot date formatting', () => {
      const spy = vi.spyOn(Date.prototype, 'toLocaleDateString');
      render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
      expect(spy).toHaveBeenCalledWith('en', expect.objectContaining({ weekday: 'short' }));
      spy.mockRestore();
    });
  });
});

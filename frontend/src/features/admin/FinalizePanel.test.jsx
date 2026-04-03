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

  // ─── UI-8: Heading uses admin-section-title for consistency ───────────────

  it('finalize section heading uses admin-section-title class', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByTestId('finalize-section-title')).toHaveClass('admin-section-title');
  });

  it('renders slot cards', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByTestId('slot-card-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('slot-card-slot-2')).toBeInTheDocument();
  });

  it('renders venue mode radio buttons', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByRole('radio', { name: /use selected/i })).toBeInTheDocument();
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

  // ─── UI-4: Instructional copy links no-venue state to venue list ──────────

  it('no-venue prompt includes instruction to select from list above', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByTestId('selected-venue-display')).toHaveTextContent(/list above/i);
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
    fireEvent.click(screen.getByTestId('finalize-btn'));
    fireEvent.click(screen.getByTestId('confirm-send-btn'));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/events/tok/finalize',
      expect.objectContaining({ method: 'POST' })
    ));
    expect(onFinalized).toHaveBeenCalled();
  });

  it('does not call the API when Finalize Event is first clicked (modal opens instead)', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByTestId('finalize-btn'));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits venue_id when a recommended venue is selected', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} selectedVenueId="v1" selectedVenueName="The Anchor Pub" />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByTestId('finalize-btn'));
    fireEvent.click(screen.getByTestId('confirm-send-btn'));

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
    fireEvent.click(screen.getByTestId('finalize-btn'));
    fireEvent.click(screen.getByTestId('confirm-send-btn'));

    await waitFor(() => {
      const [, options] = fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.venue_name).toBe('The Blue Note');
      expect(body.venue_address).toBe('131 W 3rd St');
      expect(body.venue_id).toBeUndefined();
    });
  });

  it('renders the duration selector', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByTestId('duration-select')).toBeInTheDocument();
  });

  it('defaults the duration selector to 60 minutes', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByTestId('duration-select')).toHaveValue('60');
  });

  it('does not show a "same as slot" option in the duration selector', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    const select = screen.getByTestId('duration-select');
    const options = Array.from(select.querySelectorAll('option'));
    expect(options.every(o => o.value !== '')).toBe(true);
  });

  it('renders the notes textarea', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    expect(screen.getByTestId('finalize-notes')).toBeInTheDocument();
  });

  it('submits duration_minutes when a duration is selected', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.change(screen.getByTestId('duration-select'), { target: { value: '90' } });
    fireEvent.click(screen.getByTestId('finalize-btn'));
    fireEvent.click(screen.getByTestId('confirm-send-btn'));

    await waitFor(() => {
      const [, options] = fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.duration_minutes).toBe(90);
    });
  });

  it('submits duration_minutes: 60 by default without any user selection', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByTestId('finalize-btn'));
    fireEvent.click(screen.getByTestId('confirm-send-btn'));

    await waitFor(() => {
      const [, options] = fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.duration_minutes).toBe(60);
    });
  });

  it('submits notes when entered', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.change(screen.getByTestId('finalize-notes'), { target: { value: 'Please bring ID' } });
    fireEvent.click(screen.getByTestId('finalize-btn'));
    fireEvent.click(screen.getByTestId('confirm-send-btn'));

    await waitFor(() => {
      const [, options] = fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.notes).toBe('Please bring ID');
    });
  });

  it('does not submit notes when textarea is empty', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: 'finalized' }) });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByTestId('finalize-btn'));
    fireEvent.click(screen.getByTestId('confirm-send-btn'));

    await waitFor(() => {
      const [, options] = fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.notes).toBeUndefined();
    });
  });

  it('auto-selects the slot and enables finalize when only one slot is provided', () => {
    const single = [{ id: 'solo-1', starts_at: '2025-07-10T14:00:00.000Z', ends_at: '2025-07-10T15:00:00.000Z' }];
    render(<FinalizePanel adminToken="tok" slots={single} />);
    expect(screen.getByRole('button', { name: /finalize/i })).not.toBeDisabled();
  });

  it('shows error message when finalization fails', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Event is already finalized' }),
    });

    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByTestId('finalize-btn'));
    fireEvent.click(screen.getByTestId('confirm-send-btn'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Event is already finalized')
    );
  });

  // ─── UX-1: Confirmation modal ─────────────────────────────────────────────

  it('clicking Finalize Event opens a confirmation modal', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByTestId('finalize-btn'));
    expect(screen.getByTestId('finalize-confirm-modal')).toBeInTheDocument();
  });

  it('confirmation modal shows the chosen slot date', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByTestId('finalize-btn'));
    expect(screen.getByTestId('confirm-slot-value')).toBeInTheDocument();
  });

  it('confirmation modal shows the selected venue name', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} selectedVenueId="v1" selectedVenueName="The Anchor Pub" />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByTestId('finalize-btn'));
    expect(screen.getByTestId('finalize-confirm-modal')).toHaveTextContent('The Anchor Pub');
  });

  it('clicking Cancel in the confirmation modal hides it', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByTestId('finalize-btn'));
    expect(screen.getByTestId('finalize-confirm-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-cancel-btn'));
    expect(screen.queryByTestId('finalize-confirm-modal')).not.toBeInTheDocument();
  });

  // ─── UX-2: Disable when custom venue name empty ───────────────────────────

  it('finalize button is disabled in custom mode when venue name is empty', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByRole('radio', { name: /enter custom venue/i }));
    expect(screen.getByTestId('finalize-btn')).toBeDisabled();
  });

  it('finalize button is enabled in custom mode when venue name is filled', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByTestId('slot-card-slot-1'));
    fireEvent.click(screen.getByRole('radio', { name: /enter custom venue/i }));
    fireEvent.change(screen.getByTestId('custom-venue-name'), { target: { value: 'The Blue Note' } });
    expect(screen.getByTestId('finalize-btn')).not.toBeDisabled();
  });

  it('shows a required hint near the custom venue name field when it is empty', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByRole('radio', { name: /enter custom venue/i }));
    expect(screen.getByTestId('custom-venue-required')).toBeInTheDocument();
  });

  it('hides the required hint once the custom venue name is filled', () => {
    render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
    fireEvent.click(screen.getByRole('radio', { name: /enter custom venue/i }));
    fireEvent.change(screen.getByTestId('custom-venue-name'), { target: { value: 'Foo' } });
    expect(screen.queryByTestId('custom-venue-required')).not.toBeInTheDocument();
  });

  // ─── UX-11: Venue mode resets when venue selected in custom mode ──────────

  it('switches venue mode back to recommended when a venue is selected while in custom mode', () => {
    const { rerender } = render(<FinalizePanel adminToken="tok" slots={SLOTS} selectedVenueId={null} />);
    fireEvent.click(screen.getByRole('radio', { name: /enter custom venue/i }));
    expect(screen.getByTestId('custom-venue-name')).toBeInTheDocument();

    rerender(<FinalizePanel adminToken="tok" slots={SLOTS} selectedVenueId="v1" selectedVenueName="The Anchor Pub" />);

    expect(screen.getByTestId('selected-venue-display')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-venue-name')).not.toBeInTheDocument();
  });

  it('does not switch venue mode when no venue is selected (selectedVenueId remains null)', () => {
    const { rerender } = render(<FinalizePanel adminToken="tok" slots={SLOTS} selectedVenueId={null} />);
    fireEvent.click(screen.getByRole('radio', { name: /enter custom venue/i }));
    rerender(<FinalizePanel adminToken="tok" slots={SLOTS} selectedVenueId={null} />);
    expect(screen.getByTestId('custom-venue-name')).toBeInTheDocument();
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the heading', () => {
      i18n.addResourceBundle('en', 'common', { finalize: { heading: '__FINALIZE_HEADING_TEST__' } }, true, true);
      render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
      expect(screen.getByTestId('finalize-section-title')).toHaveTextContent('__FINALIZE_HEADING_TEST__');
    });

    it('uses i18n key for generic error when backend returns no error field', async () => {
      fetch.mockResolvedValue({ ok: false, json: async () => ({}) });
      i18n.addResourceBundle('en', 'common', { finalize: { errorGeneric: '__GENERIC_ERROR__' } }, true, true);
      render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
      fireEvent.click(screen.getByTestId('slot-card-slot-1'));
      fireEvent.click(screen.getByTestId('finalize-btn'));
      fireEvent.click(screen.getByTestId('confirm-send-btn'));
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('__GENERIC_ERROR__'));
    });

    it('passes i18n.language as locale to slot date formatting', () => {
      const spy = vi.spyOn(Date.prototype, 'toLocaleDateString');
      render(<FinalizePanel adminToken="tok" slots={SLOTS} />);
      expect(spy).toHaveBeenCalledWith('en', expect.objectContaining({ weekday: 'short' }));
      spy.mockRestore();
    });
  });
});

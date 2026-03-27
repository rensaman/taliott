import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AdminView from './AdminView.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

let capturedSseHandler = null;
vi.mock('../../hooks/useEventStream.js', () => ({
  useEventStream: (_eventId, onMessage) => {
    capturedSseHandler = onMessage;
  },
}));

const MOCK_VENUES_FOR_MAP = [
  { id: 'mv1', name: 'Mock Venue 1', latitude: 1, longitude: 1 },
  { id: 'mv2', name: 'Mock Venue 2', latitude: 2, longitude: 2 },
];

// GroupMap uses Leaflet — mock it for AdminView tests
let capturedOnVenueClick = null;
vi.mock('./GroupMap.jsx', () => ({
  default: ({ centroid, participants, venues, onVenueClick, selectedVenueId }) => {
    capturedOnVenueClick = onVenueClick;
    return (
      <div data-testid="group-map" data-selected-venue-id={selectedVenueId ?? ''}>
        {centroid && (
          <span data-testid="coverage-counter">
            {centroid.count} of {participants.length} participants included in fair center
          </span>
        )}
        {venues?.map((v, i) => (
          <button key={v.id} data-testid={`venue-pin-${i + 1}`} onClick={() => onVenueClick?.(v.id)} />
        ))}
      </div>
    );
  },
}));

let capturedOnVenuesLoaded = null;
let capturedOnSelectVenue = null;
vi.mock('./VenueList.jsx', () => ({
  default: ({ defaultVenueType, onVenuesLoaded, selectedId, onSelectVenue }) => {
    capturedOnVenuesLoaded = onVenuesLoaded;
    capturedOnSelectVenue = onSelectVenue;
    return (
      <div
        data-testid="venue-list"
        data-venue-type={defaultVenueType}
        data-selected-id={selectedId ?? ''}
      />
    );
  },
}));

const OPEN_DATA = {
  id: 'event-uuid-1',
  name: 'Summer Meetup',
  deadline: '2099-06-01T12:00:00Z',
  status: 'open',
  slot_count: 12,
  venue_type: 'restaurant',
  centroid: { lat: 1, lng: 1, count: 1 },
  slots: [{ id: 'slot-1', starts_at: '2025-06-15T09:00:00.000Z', ends_at: '2025-06-15T10:00:00.000Z' }],
  final_slot_id: null,
  final_venue_name: null,
  final_venue_address: null,
  final_duration_minutes: null,
  final_notes: null,
  participants: [
    { id: 'p-1', email: 'alex@example.com', responded_at: '2025-01-01T10:00:00Z', latitude: 1, longitude: 1 },
    { id: 'p-2', email: 'jamie@example.com', responded_at: null, latitude: null, longitude: null },
    { id: 'p-3', email: 'sam@example.com', responded_at: null, latitude: null, longitude: null },
  ],
};

const FINALIZED_DATA = {
  ...OPEN_DATA,
  status: 'finalized',
  final_slot_id: 'slot-1',
  final_venue_name: 'The Blue Note',
  final_venue_address: '131 W 3rd St',
  final_duration_minutes: 90,
  final_notes: 'Please bring ID',
};

describe('AdminView', () => {
  beforeEach(() => {
    capturedSseHandler = null;
    capturedOnVenueClick = null;
    capturedOnVenuesLoaded = null;
    capturedOnSelectVenue = null;
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows loading while fetching', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<AdminView adminToken="some-token" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders event name after loading', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /summer meetup/i })).toBeInTheDocument()
    );
  });

  it('renders event status', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() =>
      expect(screen.getByText(/open/i)).toBeInTheDocument()
    );
  });

  it('renders response count summary', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() =>
      expect(screen.getByText(/1 of 3 responded/i)).toBeInTheDocument()
    );
  });

  it('renders all participant emails', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() =>
      expect(screen.getByText('alex@example.com')).toBeInTheDocument()
    );
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
  });

  it('shows error on failed fetch', async () => {
    fetch.mockResolvedValue({ ok: false, status: 404 });
    render(<AdminView adminToken="bad-token" />);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );
  });

  it('renders the group map', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() =>
      expect(screen.getByTestId('group-map')).toBeInTheDocument()
    );
  });

  it('shows coverage counter when centroid is present', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() =>
      expect(screen.getByTestId('coverage-counter')).toBeInTheDocument()
    );
  });

  it('renders the venue list section', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() =>
      expect(screen.getByTestId('venue-list')).toBeInTheDocument()
    );
  });

  it('passes venue_type to venue list', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() =>
      expect(screen.getByTestId('venue-list')).toHaveAttribute('data-venue-type', 'restaurant')
    );
  });

  // ─── GDPR: Delete event ───────────────────────────────────────────────────

  it('shows a Delete event button', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() => screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('button', { name: /delete event/i })).toBeInTheDocument();
  });

  it('calls DELETE /api/events/:token when confirmed and navigates home', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_DATA })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    const assignSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignSpy });

    render(<AdminView adminToken="some-token" />);
    await waitFor(() => screen.getByRole('heading', { level: 1 }));

    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/events/some-token',
        expect.objectContaining({ method: 'DELETE' })
      )
    );
    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('/'));
  });

  it('does not call DELETE when user cancels the confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });

    render(<AdminView adminToken="some-token" />);
    await waitFor(() => screen.getByRole('heading', { level: 1 }));

    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));

    expect(fetch).toHaveBeenCalledTimes(1); // only the initial dashboard load
  });

  it('shows an error when DELETE fails', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_DATA })
      .mockResolvedValueOnce({ ok: false });

    render(<AdminView adminToken="some-token" />);
    await waitFor(() => screen.getByRole('heading', { level: 1 }));

    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );
  });

  it('passes venues from VenueList to GroupMap as numbered pins', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() => screen.getByTestId('group-map'));

    act(() => capturedOnVenuesLoaded(MOCK_VENUES_FOR_MAP));

    await waitFor(() => expect(screen.getByTestId('venue-pin-1')).toBeInTheDocument());
    expect(screen.getByTestId('venue-pin-2')).toBeInTheDocument();
  });

  it('clicking a map pin updates selectedId passed to VenueList', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() => screen.getByTestId('group-map'));

    act(() => capturedOnVenuesLoaded(MOCK_VENUES_FOR_MAP));
    await waitFor(() => screen.getByTestId('venue-pin-1'));

    fireEvent.click(screen.getByTestId('venue-pin-1'));

    expect(screen.getByTestId('venue-list')).toHaveAttribute('data-selected-id', 'mv1');
  });

  it('selecting a venue from VenueList updates selectedVenueId on GroupMap', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() => screen.getByTestId('venue-list'));

    act(() => capturedOnSelectVenue({ id: 'mv2', latitude: 2, longitude: 2, name: 'Mock Venue 2' }));

    await waitFor(() =>
      expect(screen.getByTestId('group-map')).toHaveAttribute('data-selected-venue-id', 'mv2')
    );
  });

  it('updates group map centroid when SSE location event arrives', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
    render(<AdminView adminToken="some-token" />);
    // initial centroid from API
    await waitFor(() => expect(screen.getByTestId('coverage-counter')).toHaveTextContent('1 of 3'));

    // SSE pushes a new centroid with count=2
    act(() => capturedSseHandler({ type: 'location', centroid: { lat: 2, lng: 3, count: 2 } }));
    await waitFor(() =>
      expect(screen.getByTestId('coverage-counter')).toHaveTextContent('2 of 3')
    );
  });

  // ─── Finalized summary ────────────────────────────────────────────────────

  it('shows finalized summary with slot, venue, duration, and notes when finalized', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => FINALIZED_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() => expect(screen.getByTestId('finalized-summary')).toBeInTheDocument());
    expect(screen.getByTestId('finalized-summary')).toHaveTextContent('The Blue Note');
    expect(screen.getByTestId('finalized-summary')).toHaveTextContent('131 W 3rd St');
    expect(screen.getByTestId('finalized-summary')).toHaveTextContent('Please bring ID');
  });

  it('does not show the finalize form when event is finalized', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => FINALIZED_DATA });
    render(<AdminView adminToken="some-token" />);
    await waitFor(() => expect(screen.queryByTestId('finalize-panel')).not.toBeInTheDocument());
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the participants section title', async () => {
      i18n.addResourceBundle('en', 'common', { admin: { sectionParticipants: '__PARTICIPANTS_TEST__' } }, true, true);
      fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
      render(<AdminView adminToken="some-token" />);
      await waitFor(() =>
        expect(screen.getByText('__PARTICIPANTS_TEST__')).toBeInTheDocument()
      );
    });

    it('passes i18n.language as locale to deadline toLocaleString', async () => {
      const spy = vi.spyOn(Date.prototype, 'toLocaleString');
      fetch.mockResolvedValue({ ok: true, json: async () => OPEN_DATA });
      render(<AdminView adminToken="some-token" />);
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      expect(spy).toHaveBeenCalledWith('en');
      spy.mockRestore();
    });
  });
});

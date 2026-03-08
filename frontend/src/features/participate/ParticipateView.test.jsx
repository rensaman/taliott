import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./LocationMap.jsx', () => ({ default: vi.fn() }));
vi.mock('./AddressSearchInput.jsx', () => ({ default: vi.fn() }));
vi.mock('./AvailabilityGrid.jsx', () => ({ default: vi.fn() }));
vi.mock('./HeatmapGrid.jsx', () => ({ default: vi.fn() }));
vi.mock('../admin/GroupMap.jsx', () => ({ default: vi.fn() }));

// Capture the SSE message handler so tests can push events
let capturedSseHandler = null;
vi.mock('../../hooks/useEventStream.js', () => ({
  useEventStream: (_eventId, onMessage) => {
    capturedSseHandler = onMessage;
  },
}));

import LocationMap from './LocationMap.jsx';
import AddressSearchInput from './AddressSearchInput.jsx';
import AvailabilityGrid from './AvailabilityGrid.jsx';
import HeatmapGrid from './HeatmapGrid.jsx';
import GroupMap from '../admin/GroupMap.jsx';
import ParticipateView from './ParticipateView.jsx';

const BASE_HEATMAP = { total_participants: 1, slots: [{ slot_id: 's-1', yes_count: 0 }] };

const LOCKED_RESPONSE = {
  event: {
    id: 'e-1',
    name: 'Locked Event',
    deadline: '2020-01-01T00:00:00Z',
    status: 'locked',
    locked: true,
  },
  participant: { id: 'p-1', email: 'jamie@example.com', latitude: null, longitude: null, address_label: null, responded_at: null },
  slots: [{ id: 's-1', starts_at: '2025-06-01T08:00:00Z', ends_at: '2025-06-01T09:00:00Z' }],
  availability: [],
  heatmap: BASE_HEATMAP,
  centroid: null,
};

const OPEN_RESPONSE = {
  ...LOCKED_RESPONSE,
  event: {
    ...LOCKED_RESPONSE.event,
    name: 'Open Event',
    deadline: '2099-01-01T00:00:00Z',
    status: 'open',
    locked: false,
  },
};

describe('ParticipateView', () => {
  beforeEach(() => {
    capturedSseHandler = null;
    vi.stubGlobal('fetch', vi.fn());
    LocationMap.mockImplementation(() => <div data-testid="location-map" />);
    AddressSearchInput.mockImplementation(() => <div data-testid="address-search" />);
    AvailabilityGrid.mockImplementation(({ slots }) => (
      <div data-testid="availability-grid" data-slots={slots.length} />
    ));
    HeatmapGrid.mockImplementation(({ heatmap }) => (
      <div data-testid="heatmap-grid" data-total={heatmap?.total_participants ?? 0} />
    ));
    GroupMap.mockImplementation(({ centroid }) => (
      <div data-testid="group-map" data-centroid={centroid ? 'set' : 'null'} />
    ));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows loading while fetching', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<ParticipateView participantId="p-1" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows the event name after loading', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /locked event/i })).toBeInTheDocument()
    );
  });

  it('shows "Results only" status banner when event is locked', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/results only/i)
    );
  });

  it('does not show "Results only" when event is open', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /open event/i })).toBeInTheDocument()
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows an error when fetch fails', async () => {
    fetch.mockResolvedValue({ ok: false });
    render(<ParticipateView participantId="bad" />);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );
  });

  it('renders the availability grid with the correct number of slots', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('availability-grid')).toHaveAttribute('data-slots', '1')
    );
  });

  it('renders HeatmapGrid with initial heatmap from API', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('heatmap-grid')).toHaveAttribute('data-total', '1')
    );
  });

  it('updates HeatmapGrid when SSE availability event arrives', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('heatmap-grid')).toBeInTheDocument());

    const updatedHeatmap = { total_participants: 2, slots: [{ slot_id: 's-1', yes_count: 1 }] };
    act(() => capturedSseHandler({ type: 'availability', heatmap: updatedHeatmap }));
    await waitFor(() =>
      expect(screen.getByTestId('heatmap-grid')).toHaveAttribute('data-total', '2')
    );
  });

  it('updates GroupMap centroid when SSE location event arrives', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('group-map')).toHaveAttribute('data-centroid', 'null'));

    act(() => capturedSseHandler({ type: 'location', centroid: { lat: 1, lng: 2, count: 1 } }));
    await waitFor(() =>
      expect(screen.getByTestId('group-map')).toHaveAttribute('data-centroid', 'set')
    );
  });

  it('shows location section when event is open', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('address-search')).toBeInTheDocument()
    );
    expect(screen.getByTestId('location-map')).toBeInTheDocument();
  });

  it('hides location section when event is locked', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByRole('heading')).toBeInTheDocument());
    expect(screen.queryByTestId('address-search')).not.toBeInTheDocument();
  });

  it('passes existing location to LocationMap when participant has coordinates', async () => {
    const withLocation = {
      ...OPEN_RESPONSE,
      participant: { ...OPEN_RESPONSE.participant, latitude: 48.8, longitude: 2.3, address_label: 'Paris' },
    };
    let capturedLocation;
    LocationMap.mockImplementation(({ location }) => {
      capturedLocation = location;
      return <div data-testid="location-map" />;
    });
    fetch.mockResolvedValue({ ok: true, json: async () => withLocation });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('location-map')).toBeInTheDocument());
    expect(capturedLocation).toEqual({ lat: 48.8, lng: 2.3, label: 'Paris' });
  });

  it('shows location save error when PATCH location fails with non-ok response', async () => {
    AddressSearchInput.mockImplementation(({ onSelect }) => (
      <button onClick={() => onSelect({ lat: 1, lng: 2, label: 'X' })}>select</button>
    ));
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_RESPONSE })
      .mockResolvedValueOnce({ ok: false });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'select' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'select' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to save location/i)
    );
  });

  it('shows location save error when PATCH location throws', async () => {
    AddressSearchInput.mockImplementation(({ onSelect }) => (
      <button onClick={() => onSelect({ lat: 1, lng: 2, label: 'X' })}>select</button>
    ));
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_RESPONSE })
      .mockRejectedValueOnce(new Error('Network error'));
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'select' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'select' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to save location/i)
    );
  });

  it('shows "Mark as done" button on open event', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('confirm-btn')).toHaveTextContent(/mark as done/i)
    );
  });

  it('hides confirm button when event is locked', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() => expect(screen.getByRole('heading')).toBeInTheDocument());
    expect(screen.queryByTestId('confirm-btn')).not.toBeInTheDocument();
  });

  it('shows "Submitted" button label when participant has already responded', async () => {
    const alreadyResponded = {
      ...OPEN_RESPONSE,
      participant: { ...OPEN_RESPONSE.participant, responded_at: '2025-01-01T12:00:00Z' },
    };
    fetch.mockResolvedValue({ ok: true, json: async () => alreadyResponded });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('confirm-btn')).toHaveTextContent(/submitted/i)
    );
  });

  it('switches button label to "Submitted" after clicking "Mark as done"', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => OPEN_RESPONSE })
      .mockResolvedValueOnce({ ok: true });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('confirm-btn')).toHaveTextContent(/mark as done/i)
    );
    fireEvent.click(screen.getByTestId('confirm-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('confirm-btn')).toHaveTextContent(/submitted/i)
    );
  });

  it('shows "Voting closed" badge when locked', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByText(/voting closed/i)).toBeInTheDocument()
    );
  });

  it('shows "Voting deadline" badge when open', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => OPEN_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getByText(/voting deadline/i)).toBeInTheDocument()
    );
  });
});

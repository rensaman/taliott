import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock location components — they use Leaflet and fetch internally
vi.mock('./LocationMap.jsx', () => ({ default: () => <div data-testid="location-map" /> }));
vi.mock('./AddressSearchInput.jsx', () => ({ default: () => <div data-testid="address-search" /> }));

import ParticipateView from './ParticipateView.jsx';

const LOCKED_RESPONSE = {
  event: {
    id: 'e-1',
    name: 'Locked Event',
    deadline: '2020-01-01T00:00:00Z',
    status: 'locked',
    locked: true,
  },
  participant: { id: 'p-1', email: 'jamie@example.com', latitude: null, longitude: null, address_label: null },
  slots: [{ id: 's-1', starts_at: '2025-06-01T08:00:00Z', ends_at: '2025-06-01T09:00:00Z' }],
  availability: [],
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
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
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

  it('shows an error when fetch fails', async () => {
    fetch.mockResolvedValue({ ok: false });
    render(<ParticipateView participantId="bad" />);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );
  });

  it('renders a slot row for each slot', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => LOCKED_RESPONSE });
    render(<ParticipateView participantId="p-1" />);
    await waitFor(() =>
      expect(screen.getAllByTestId('slot')).toHaveLength(1)
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
    await waitFor(() =>
      expect(screen.getByRole('heading')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('address-search')).not.toBeInTheDocument();
  });
});

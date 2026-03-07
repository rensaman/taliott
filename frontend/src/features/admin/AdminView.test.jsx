import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AdminView from './AdminView.jsx';

// GroupMap uses Leaflet — mock it for AdminView tests
vi.mock('./GroupMap.jsx', () => ({
  default: ({ centroid, participants }) => (
    <div data-testid="group-map">
      {centroid && (
        <span data-testid="coverage-counter">
          {centroid.count} of {participants.length} participants included in fair center
        </span>
      )}
    </div>
  ),
}));

const OPEN_DATA = {
  name: 'Summer Meetup',
  deadline: '2099-06-01T12:00:00Z',
  status: 'open',
  slot_count: 12,
  centroid: { lat: 1, lng: 1, count: 1 },
  participants: [
    { id: 'p-1', email: 'alex@example.com', responded_at: '2025-01-01T10:00:00Z', latitude: 1, longitude: 1 },
    { id: 'p-2', email: 'jamie@example.com', responded_at: null, latitude: null, longitude: null },
    { id: 'p-3', email: 'sam@example.com', responded_at: null, latitude: null, longitude: null },
  ],
};

describe('AdminView', () => {
  beforeEach(() => {
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
});

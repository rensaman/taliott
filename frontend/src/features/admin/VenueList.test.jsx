import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VenueList from './VenueList.jsx';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

const MOCK_VENUES = [
  { id: 'v1', name: 'The Restaurant', distanceM: 200, rating: 4.5, latitude: 51.5, longitude: -0.1 },
  { id: 'v2', name: 'Cafe Bistro', distanceM: 500, rating: null, latitude: 51.505, longitude: -0.09 },
];

describe('VenueList', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches and renders venue cards when defaultVenueType is set', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: MOCK_VENUES }) });
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" />);
    await waitFor(() => expect(screen.getByText('The Restaurant')).toBeInTheDocument());
    expect(screen.getByText('Cafe Bistro')).toBeInTheDocument();
    expect(screen.getAllByTestId('venue-card')).toHaveLength(2);
  });

  it('shows loading state while fetching', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" />);
    expect(screen.getByText(/loading venues/i)).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Service unavailable' }) });
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
  });

  it('shows empty message when no venues found', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: [] }) });
    render(<VenueList adminToken="tok" defaultVenueType="bar" />);
    await waitFor(() => expect(screen.getByText(/no venues found/i)).toBeInTheDocument());
  });

  it('shows prompt when no venue type is set and does not fetch', () => {
    render(<VenueList adminToken="tok" defaultVenueType="" />);
    expect(screen.getByText(/set a venue type/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('each venue card shows name, distance, rating, and map pin', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: MOCK_VENUES }) });
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" />);
    await waitFor(() => expect(screen.getAllByTestId('venue-card')).toHaveLength(2));

    const cards = screen.getAllByTestId('venue-card');
    expect(cards[0]).toHaveTextContent('The Restaurant');
    expect(cards[0]).toHaveTextContent('200 m');
    expect(cards[0]).toHaveTextContent('4.5');
    expect(cards[0]).toHaveTextContent(/pin|📍/i);

    // Second card has no rating
    expect(cards[1]).toHaveTextContent('Cafe Bistro');
    expect(cards[1]).toHaveTextContent('500 m');
    expect(screen.queryAllByTestId('venue-rating')).toHaveLength(1);
  });

  it('shows distance in km for venues over 1000m away', async () => {
    const farVenues = [{ id: 'v3', name: 'Far Place', distanceM: 1500, rating: null, latitude: 51.6, longitude: -0.2 }];
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: farVenues }) });
    render(<VenueList adminToken="tok" defaultVenueType="bar" />);
    await waitFor(() => expect(screen.getByText(/1\.5 km/i)).toBeInTheDocument());
  });

  it('renders radio buttons for each venue', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: MOCK_VENUES }) });
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" />);
    await waitFor(() => expect(screen.getAllByTestId('venue-radio')).toHaveLength(2));
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('calls onSelectVenue when a radio button is selected', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: MOCK_VENUES }) });
    const onSelectVenue = vi.fn();
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" onSelectVenue={onSelectVenue} />);
    await waitFor(() => expect(screen.getAllByTestId('venue-radio')).toHaveLength(2));
    fireEvent.click(screen.getAllByTestId('venue-radio')[0]);
    expect(onSelectVenue).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
  });

  it('venue names are rendered as links', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: MOCK_VENUES }) });
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" />);
    await waitFor(() => expect(screen.getByRole('link', { name: 'The Restaurant' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'The Restaurant' })).toHaveAttribute('href', expect.stringContaining('openstreetmap.org'));
  });

  it('fetches with a single type when a chip is clicked', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: MOCK_VENUES }) });
    render(<VenueList adminToken="tok" defaultVenueType="" />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bar' }));
    await waitFor(() => expect(screen.getByText('The Restaurant')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain('venue_type=bar');
  });

  it('fetches for each selected type when multiple chips are active (OR logic)', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: MOCK_VENUES }) });
    render(<VenueList adminToken="tok" defaultVenueType="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bar' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Cafe' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    const urls = fetch.mock.calls.map(c => c[0]);
    expect(urls.some(u => u.includes('venue_type=bar'))).toBe(true);
    expect(urls.some(u => u.includes('venue_type=cafe'))).toBe(true);
  });

  it('shows 10 venues initially and a show-more button when more are available', async () => {
    const manyVenues = Array.from({ length: 12 }, (_, i) => ({
      id: `v${i}`, name: `Venue ${i}`, distanceM: i * 100, rating: null,
      latitude: 51.5, longitude: -0.1,
    }));
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: manyVenues }) });
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" />);
    await waitFor(() => expect(screen.getAllByTestId('venue-card')).toHaveLength(10));
    // Only 2 remaining, so button shows "Show 2 more"
    expect(screen.getByRole('button', { name: /show 2 more/i })).toBeInTheDocument();
  });

  it('show-more button reveals up to 5 more venues per click', async () => {
    const manyVenues = Array.from({ length: 20 }, (_, i) => ({
      id: `v${i}`, name: `Venue ${i}`, distanceM: i * 100, rating: null,
      latitude: 51.5, longitude: -0.1,
    }));
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: manyVenues }) });
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" />);
    await waitFor(() => expect(screen.getAllByTestId('venue-card')).toHaveLength(10));
    fireEvent.click(screen.getByRole('button', { name: /show 5 more/i }));
    expect(screen.getAllByTestId('venue-card')).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: /show 5 more/i }));
    expect(screen.getAllByTestId('venue-card')).toHaveLength(20);
    expect(screen.queryByRole('button', { name: /show/i })).not.toBeInTheDocument();
  });

  it('resets display limit to 10 when venue type filter changes', async () => {
    const barVenues = Array.from({ length: 12 }, (_, i) => ({
      id: `b${i}`, name: `Bar ${i}`, distanceM: 200 + i * 50, rating: null,
      latitude: 51.5, longitude: -0.1,
    }));
    const cafeVenues = Array.from({ length: 12 }, (_, i) => ({
      id: `c${i}`, name: `Cafe ${i}`, distanceM: 100 + i * 60, rating: null,
      latitude: 51.5, longitude: -0.1,
    }));
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ venues: barVenues }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ venues: barVenues }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ venues: cafeVenues }) });

    render(<VenueList adminToken="tok" defaultVenueType="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bar' }));
    await waitFor(() => expect(screen.getAllByTestId('venue-card')).toHaveLength(10));
    fireEvent.click(screen.getByRole('button', { name: /show/i }));
    expect(screen.getAllByTestId('venue-card')).toHaveLength(12); // all bars visible

    // Adding a second category resets limit to 10
    fireEvent.click(screen.getByRole('button', { name: 'Cafe' }));
    // 24 total merged (12 bar + 12 cafe), capped back to 10
    await waitFor(() => expect(screen.getAllByTestId('venue-card')).toHaveLength(10));
  });

  it('marks the venue matching selectedId prop as selected', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: MOCK_VENUES }) });
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" selectedId="v2" onSelectVenue={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByTestId('venue-card')).toHaveLength(2));
    const cards = screen.getAllByTestId('venue-card');
    expect(cards[0]).not.toHaveClass('venue-card-block--selected');
    expect(cards[1]).toHaveClass('venue-card-block--selected');
  });

  it('merges and deduplicates venues from multiple types sorted by distance', async () => {
    const barVenues = [
      { id: 'b1', name: 'Far Bar', distanceM: 800, rating: null, latitude: 51.5, longitude: -0.1 },
    ];
    const cafeVenues = [
      { id: 'c1', name: 'Near Cafe', distanceM: 100, rating: null, latitude: 51.5, longitude: -0.1 },
      { id: 'b1', name: 'Far Bar', distanceM: 800, rating: null, latitude: 51.5, longitude: -0.1 }, // duplicate
    ];
    // Round 1: bar only (1 fetch). Round 2: bar + cafe (2 fetches in order: bar, cafe)
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ venues: barVenues }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ venues: barVenues }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ venues: cafeVenues }) });

    render(<VenueList adminToken="tok" defaultVenueType="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bar' }));
    await waitFor(() => expect(screen.getAllByTestId('venue-card')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Cafe' }));
    await waitFor(() => expect(screen.getAllByTestId('venue-card')).toHaveLength(2));
    const cards = screen.getAllByTestId('venue-card');
    expect(cards[0]).toHaveTextContent('Near Cafe');
    expect(cards[1]).toHaveTextContent('Far Bar');
  });
});

describe('i18n', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    i18n.removeResourceBundle('en', 'common');
    i18n.addResourceBundle('en', 'common', enCommon, true, true);
  });

  it('uses i18n for the section heading', () => {
    i18n.addResourceBundle('en', 'common', { venueList: { heading: '__VENUE_HEADING_TEST__' } }, true, true);
    render(<VenueList adminToken="tok" defaultVenueType="" />);
    expect(screen.getByRole('heading', { name: '__VENUE_HEADING_TEST__' })).toBeInTheDocument();
  });
});

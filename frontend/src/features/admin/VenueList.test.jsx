import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VenueList from './VenueList.jsx';

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

  it('re-fetches with new venue type when filter is changed', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: MOCK_VENUES }) });
    render(<VenueList adminToken="tok" defaultVenueType="restaurant" />);
    await waitFor(() => expect(screen.getByText('The Restaurant')).toBeInTheDocument());

    fetch.mockResolvedValue({ ok: true, json: async () => ({ venues: [] }) });
    fireEvent.change(screen.getByLabelText(/venue type/i), { target: { value: 'bar' } });
    fireEvent.submit(screen.getByTestId('venue-type-filter'));

    await waitFor(() => expect(screen.getByText(/no venues found/i)).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toContain('venue_type=bar');
  });
});

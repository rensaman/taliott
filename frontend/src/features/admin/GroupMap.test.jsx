import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { forwardRef } from 'react';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: forwardRef(({ children, 'data-testid': testid, eventHandlers }, _ref) => (
    <div data-testid={testid ?? 'marker'} onClick={() => eventHandlers?.click?.()}>{children}</div>
  )),
  useMap: () => ({ fitBounds: vi.fn(), flyTo: vi.fn() }),
}));
vi.mock('leaflet', () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
    divIcon: vi.fn(() => ({})),
  },
}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet/dist/images/marker-icon-2x.png', () => ({ default: '' }));
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: '' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: '' }));

import GroupMap from './GroupMap.jsx';

const CENTROID = { lat: 1, lng: 1, count: 2 };
const PARTICIPANTS = [
  { id: 'p-1', latitude: 0, longitude: 0 },
  { id: 'p-2', latitude: 2, longitude: 2 },
  { id: 'p-3', latitude: null, longitude: null },
];
const VENUES = [
  { id: 'v1', name: 'Place A', latitude: 1.1, longitude: 1.1 },
  { id: 'v2', name: 'Place B', latitude: 1.2, longitude: 1.2 },
];

describe('GroupMap', () => {
  it('renders the map container', () => {
    render(<GroupMap centroid={null} participants={[]} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders a centroid marker when centroid is provided', () => {
    render(<GroupMap centroid={CENTROID} participants={PARTICIPANTS} />);
    expect(screen.getByTestId('centroid-marker')).toBeInTheDocument();
  });

  it('does not render a centroid marker when centroid is null', () => {
    render(<GroupMap centroid={null} participants={PARTICIPANTS} />);
    expect(screen.queryByTestId('centroid-marker')).not.toBeInTheDocument();
  });

  it('renders participant markers for participants with locations', () => {
    render(<GroupMap centroid={CENTROID} participants={PARTICIPANTS} />);
    // 2 participants have locations
    expect(screen.getAllByTestId('participant-marker')).toHaveLength(2);
  });

  it('keeps coverage counter data node when centroid is provided', () => {
    render(<GroupMap centroid={CENTROID} participants={PARTICIPANTS} />);
    expect(screen.getByTestId('coverage-counter')).toBeInTheDocument();
    expect(screen.getByTestId('coverage-counter')).toHaveTextContent('2 of 3');
  });

  it('does not show coverage counter when centroid is null', () => {
    render(<GroupMap centroid={null} participants={[]} />);
    expect(screen.queryByTestId('coverage-counter')).not.toBeInTheDocument();
  });

  it('renders a numbered pin marker for each venue', () => {
    render(<GroupMap centroid={null} participants={[]} venues={VENUES} />);
    expect(screen.getByTestId('venue-pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('venue-pin-2')).toBeInTheDocument();
  });

  it('does not render venue pins when venues prop is empty', () => {
    render(<GroupMap centroid={null} participants={[]} venues={[]} />);
    expect(screen.queryByTestId('venue-pin-1')).not.toBeInTheDocument();
  });

  it('calls onVenueClick with venue id when a venue pin is clicked', () => {
    const onVenueClick = vi.fn();
    render(<GroupMap centroid={null} participants={[]} venues={VENUES} onVenueClick={onVenueClick} />);
    fireEvent.click(screen.getByTestId('venue-pin-1'));
    expect(onVenueClick).toHaveBeenCalledWith('v1');
  });
});

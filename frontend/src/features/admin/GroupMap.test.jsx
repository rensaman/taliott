import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { forwardRef } from 'react';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: forwardRef(({ children, 'data-testid': testid }, _ref) => (
    <div data-testid={testid ?? 'marker'}>{children}</div>
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

  it('shows coverage counter with count and total', () => {
    render(<GroupMap centroid={CENTROID} participants={PARTICIPANTS} />);
    expect(screen.getByTestId('coverage-counter')).toBeInTheDocument();
    expect(screen.getByText(/2 of 3 participants included in fair center/i)).toBeInTheDocument();
  });

  it('does not show coverage counter when centroid is null', () => {
    render(<GroupMap centroid={null} participants={[]} />);
    expect(screen.queryByTestId('coverage-counter')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { forwardRef } from 'react';

// Mock react-leaflet and leaflet — they rely on DOM APIs not available in jsdom
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, 'data-testid': testId }) => <div data-testid={testId ?? 'location-map'}>{children}</div>,
  TileLayer: () => null,
  Marker: forwardRef(({ children }, _ref) => <div data-testid="marker">{children}</div>),
  useMap: () => ({ flyTo: vi.fn() }),
}));
vi.mock('leaflet', () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
  },
}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet/dist/images/marker-icon-2x.png', () => ({ default: '' }));
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: '' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: '' }));

import LocationMap from './LocationMap.jsx';

describe('LocationMap', () => {
  it('renders the map container', () => {
    render(<LocationMap location={null} onLocationChange={vi.fn()} />);
    expect(screen.getByTestId('location-map')).toBeInTheDocument();
  });

  it('renders a marker when location is provided', () => {
    render(
      <LocationMap
        location={{ lat: 51.5074, lng: -0.1278 }}
        onLocationChange={vi.fn()}
      />
    );
    expect(screen.getByTestId('marker')).toBeInTheDocument();
  });

  it('does not render a marker when location is null', () => {
    render(<LocationMap location={null} onLocationChange={vi.fn()} />);
    expect(screen.queryByTestId('marker')).not.toBeInTheDocument();
  });
});

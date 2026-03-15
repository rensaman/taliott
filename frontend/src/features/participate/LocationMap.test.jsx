import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { forwardRef } from 'react';

// Mock react-leaflet and leaflet — they rely on DOM APIs not available in jsdom
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: forwardRef(function MockMarker({ children, eventHandlers }, ref) {
    // Populate ref synchronously so dragend can call marker.getLatLng()
    if (ref && typeof ref === 'object') {
      ref.current = { getLatLng: () => ({ lat: 10, lng: 20 }) };
    }
    return (
      <div data-testid="marker">
        {eventHandlers?.dragend && (
          <button data-testid="trigger-dragend" onClick={eventHandlers.dragend}>drag</button>
        )}
        {children}
      </div>
    );
  }),
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

  it('renders a static marker when readonly is true', () => {
    render(
      <LocationMap
        location={{ lat: 51.5074, lng: -0.1278 }}
        onLocationChange={vi.fn()}
        readonly
      />
    );
    expect(screen.getByTestId('marker')).toBeInTheDocument();
  });

  it('calls onLocationChange with lat/lng when draggable marker dragend fires', () => {
    const onLocationChange = vi.fn();
    render(
      <LocationMap
        location={{ lat: 51.5074, lng: -0.1278 }}
        onLocationChange={onLocationChange}
      />
    );
    fireEvent.click(screen.getByTestId('trigger-dragend'));
    expect(onLocationChange).toHaveBeenCalledWith({ lat: 10, lng: 20 });
  });
});

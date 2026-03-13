import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./AvailabilityGrid.jsx', () => ({
  default: vi.fn(),
}));
vi.mock('./LocationMap.jsx', () => ({
  default: vi.fn(),
}));

import AvailabilityGrid from './AvailabilityGrid.jsx';
import LocationMap from './LocationMap.jsx';
import ResponseSummary from './ResponseSummary.jsx';

const SLOTS = [{ id: 's-1', starts_at: '2025-06-01T08:00:00Z', ends_at: '2025-06-01T09:00:00Z' }];
const LOCATION = { lat: 47.5, lng: 19.0, label: 'Budapest' };

function renderSummary({ name = 'Jamie', location = null, travelMode = null, locked = false, onUpdate } = {}) {
  return render(
    <ResponseSummary
      participantId="p-1"
      name={name}
      slots={SLOTS}
      availability={[]}
      location={location}
      travelMode={travelMode}
      locked={locked}
      onUpdate={onUpdate ?? vi.fn()}
    />
  );
}

describe('ResponseSummary', () => {
  beforeEach(() => {
    AvailabilityGrid.mockImplementation(() => <div data-testid="availability-grid" />);
    LocationMap.mockImplementation(() => <div data-testid="location-map" />);
  });

  it('shows the participant name', () => {
    renderSummary();
    expect(screen.getByTestId('summary-name')).toHaveTextContent('Jamie');
  });

  it('does not show the name element when name is null', () => {
    renderSummary({ name: null });
    expect(screen.queryByTestId('summary-name')).not.toBeInTheDocument();
  });

  it('renders AvailabilityGrid with locked=true for read-only display', () => {
    let capturedLocked;
    AvailabilityGrid.mockImplementation(({ locked }) => {
      capturedLocked = locked;
      return <div data-testid="availability-grid" />;
    });
    renderSummary();
    expect(screen.getByTestId('availability-grid')).toBeInTheDocument();
    expect(capturedLocked).toBe(true);
  });

  it('shows address label and LocationMap when location is set', () => {
    renderSummary({ location: LOCATION });
    expect(screen.getByTestId('summary-address')).toHaveTextContent('Budapest');
    expect(screen.getByTestId('location-map')).toBeInTheDocument();
  });

  it('does not show address or map when location is null', () => {
    renderSummary({ location: null });
    expect(screen.queryByTestId('summary-address')).not.toBeInTheDocument();
    expect(screen.queryByTestId('location-map')).not.toBeInTheDocument();
  });

  it('passes readonly=true to LocationMap', () => {
    let capturedReadonly;
    LocationMap.mockImplementation(({ readonly }) => {
      capturedReadonly = readonly;
      return <div data-testid="location-map" />;
    });
    renderSummary({ location: LOCATION });
    expect(capturedReadonly).toBe(true);
  });

  it('shows the travel mode label when travelMode is set', () => {
    renderSummary({ travelMode: 'cycling' });
    expect(screen.getByTestId('summary-travel-mode')).toHaveTextContent('Cycling');
  });

  it('shows transit label for transit mode', () => {
    renderSummary({ travelMode: 'transit' });
    expect(screen.getByTestId('summary-travel-mode')).toHaveTextContent('Transit');
  });

  it('does not show travel mode element when travelMode is null', () => {
    renderSummary({ travelMode: null });
    expect(screen.queryByTestId('summary-travel-mode')).not.toBeInTheDocument();
  });

  it('shows "Update response" button when not locked', () => {
    renderSummary({ locked: false });
    expect(screen.getByTestId('update-response-btn')).toBeInTheDocument();
  });

  it('hides "Update response" button when locked', () => {
    renderSummary({ locked: true });
    expect(screen.queryByTestId('update-response-btn')).not.toBeInTheDocument();
  });
});

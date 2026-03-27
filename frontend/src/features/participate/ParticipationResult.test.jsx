import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { forwardRef } from 'react';
import i18n from '../../i18n.js';
import enCommon from '../../locales/en/common.json';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: forwardRef(({ children, 'data-testid': testid, eventHandlers }, _ref) => (
    <div data-testid={testid ?? 'marker'} onClick={() => eventHandlers?.click?.()}>{children}</div>
  )),
  Tooltip: ({ children }) => <span role="tooltip">{children}</span>,
  useMap: () => ({ fitBounds: vi.fn() }),
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

import ParticipationResult from './ParticipationResult.jsx';

const PARTICIPANTS_WITH_RESPONSES = [
  {
    id: 'p-1', name: 'Alice', latitude: 47.5, longitude: 19.0,
    responded_at: '2025-01-01T00:00:00Z',
    availability: [
      { slot_id: 's-1', state: 'yes' },
      { slot_id: 's-2', state: 'no' },
    ],
  },
  {
    id: 'p-2', name: 'Bob', latitude: 47.6, longitude: 19.1,
    responded_at: '2025-01-02T00:00:00Z',
    availability: [
      { slot_id: 's-1', state: 'maybe' },
      { slot_id: 's-2', state: 'yes' },
    ],
  },
];

const SLOTS = [
  { id: 's-1', starts_at: '2025-06-01T09:00:00Z', ends_at: '2025-06-01T10:00:00Z' },
  { id: 's-2', starts_at: '2025-06-01T10:00:00Z', ends_at: '2025-06-01T11:00:00Z' },
];

const CENTROID = { lat: 47.55, lng: 19.05, count: 2 };

describe('ParticipationResult', () => {
  it('renders the group map section', () => {
    render(
      <ParticipationResult
        participants={PARTICIPANTS_WITH_RESPONSES}
        slots={SLOTS}
        centroid={CENTROID}
      />
    );
    expect(screen.getByTestId('pv-group-map')).toBeInTheDocument();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('does not render a next steps section', () => {
    render(
      <ParticipationResult
        participants={PARTICIPANTS_WITH_RESPONSES}
        slots={SLOTS}
        centroid={null}
      />
    );
    expect(screen.queryByTestId('pv-next-steps')).not.toBeInTheDocument();
  });

  it('renders slot score cards for each slot', () => {
    render(
      <ParticipationResult
        participants={PARTICIPANTS_WITH_RESPONSES}
        slots={SLOTS}
        centroid={null}
      />
    );
    expect(screen.getByTestId('pv-slot-scores')).toBeInTheDocument();
    expect(screen.getByTestId('slot-card-s-1')).toBeInTheDocument();
    expect(screen.getByTestId('slot-card-s-2')).toBeInTheDocument();
  });

  it('sorts slots by score descending (yes*2 + maybe)', () => {
    // slot-1: Alice=yes(2), Bob=maybe(1) → score=5
    // slot-2: Alice=no(0), Bob=yes(2)    → score=2
    // so slot-1 should be ranked #1
    render(
      <ParticipationResult
        participants={PARTICIPANTS_WITH_RESPONSES}
        slots={SLOTS}
        centroid={null}
      />
    );
    const cards = screen.getAllByRole('button');
    expect(cards[0]).toHaveAttribute('data-testid', 'slot-card-s-1');
  });

  it('shows vote counts on slot cards', () => {
    render(
      <ParticipationResult
        participants={PARTICIPANTS_WITH_RESPONSES}
        slots={SLOTS}
        centroid={null}
      />
    );
    // slot-1: 1 yes, 1 maybe, 0 no
    const card1 = screen.getByTestId('slot-card-s-1');
    expect(card1).toHaveTextContent('✓ 1');
    expect(card1).toHaveTextContent('? 1');
    expect(card1).toHaveTextContent('✗ 0');
  });

  it('does not render slot scores section when slots is empty', () => {
    render(
      <ParticipationResult
        participants={PARTICIPANTS_WITH_RESPONSES}
        slots={[]}
        centroid={null}
      />
    );
    expect(screen.queryByTestId('pv-slot-scores')).not.toBeInTheDocument();
  });

  it('passes centroid to the group map', () => {
    render(
      <ParticipationResult
        participants={PARTICIPANTS_WITH_RESPONSES}
        slots={SLOTS}
        centroid={CENTROID}
      />
    );
    expect(screen.getByTestId('centroid-marker')).toBeInTheDocument();
  });

  it('renders map and slot scores side by side in the overview band', () => {
    render(
      <ParticipationResult
        participants={PARTICIPANTS_WITH_RESPONSES}
        slots={SLOTS}
        centroid={null}
      />
    );
    const band = screen.getByTestId('pv-overview-band');
    expect(band).toBeInTheDocument();
    expect(band).toContainElement(screen.getByTestId('pv-group-map'));
    expect(band).toContainElement(screen.getByTestId('pv-slot-scores'));
  });

  describe('i18n', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'common');
      i18n.addResourceBundle('en', 'common', enCommon, true, true);
    });

    it('uses i18n for the section slots title', () => {
      i18n.addResourceBundle('en', 'common', { participate: { sectionSlots: '__SLOTS_TITLE__' } }, true, true);
      render(
        <ParticipationResult
          participants={PARTICIPANTS_WITH_RESPONSES}
          slots={SLOTS}
          centroid={null}
        />
      );
      expect(screen.getByText('__SLOTS_TITLE__')).toBeInTheDocument();
    });
  });
});

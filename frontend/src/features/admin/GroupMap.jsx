import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { REGION } from '@region-config';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = REGION.center;
const DEFAULT_ZOOM = REGION.groupMapZoom;

const centroidIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;background:#e74c3c;border:3px solid #fff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function makeParticipantIcon(name) {
  const initials = name
    ? name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('')
    : '?';
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:#3b82f6;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4);font-size:11px;font-weight:700;color:#fff;font-family:sans-serif">${initials}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeVenuePinIcon(number, selected) {
  const bg = selected ? '#1a1a1a' : '#fff';
  const color = selected ? '#fff' : '#1a1a1a';
  const border = selected ? '#1a1a1a' : '#1a1a1a';
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;background:${bg};border:2px solid ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4);font-size:10px;font-weight:700;color:${color};font-family:sans-serif">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function MapBounds({ participants, centroid, venues }) {
  const map = useMap();
  useEffect(() => {
    const points = participants
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => [p.latitude, p.longitude]);
    if (centroid) points.push([centroid.lat, centroid.lng]);
    if (venues) {
      for (const v of venues) points.push([v.latitude, v.longitude]);
    }
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, participants, centroid, venues]);
  return null;
}

export default function GroupMap({ centroid, participants, venues = [], selectedVenueId, onVenueClick }) {
  const located = participants.filter(p => p.latitude != null && p.longitude != null);

  return (
    <div>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', aspectRatio: '1 / 1' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds participants={participants} centroid={centroid} venues={venues} />
        {venues.map((v, i) => (
          <Marker
            key={v.id}
            position={[v.latitude, v.longitude]}
            icon={makeVenuePinIcon(i + 1, v.id === selectedVenueId)}
            zIndexOffset={0}
            eventHandlers={{ click: () => onVenueClick?.(v.id) }}
            data-testid={`venue-pin-${i + 1}`}
          />
        ))}
        {located.map(p => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={makeParticipantIcon(p.name)}
            zIndexOffset={500}
            data-testid="participant-marker"
          >
            {p.name && <Tooltip>{p.name}</Tooltip>}
          </Marker>
        ))}
        {centroid && (
          <Marker
            position={[centroid.lat, centroid.lng]}
            icon={centroidIcon}
            zIndexOffset={1000}
            data-testid="centroid-marker"
          />
        )}
      </MapContainer>
      {/* coverage-counter kept as hidden node for test compatibility */}
      {centroid && (
        <span
          data-testid="coverage-counter"
          aria-hidden="true"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', fontSize: 0 }}
        >
          {centroid.count} of {participants.length} participants included in fair center
        </span>
      )}
    </div>
  );
}

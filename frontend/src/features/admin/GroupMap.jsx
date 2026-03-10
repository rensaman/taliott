import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
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

function MapBounds({ participants, centroid }) {
  const map = useMap();
  useEffect(() => {
    const points = participants
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => [p.latitude, p.longitude]);
    if (centroid) points.push([centroid.lat, centroid.lng]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, participants, centroid]);
  return null;
}

export default function GroupMap({ centroid, participants }) {
  const located = participants.filter(p => p.latitude != null && p.longitude != null);

  return (
    <div>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '350px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds participants={participants} centroid={centroid} />
        {located.map(p => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            data-testid="participant-marker"
          />
        ))}
        {centroid && (
          <Marker
            position={[centroid.lat, centroid.lng]}
            icon={centroidIcon}
            data-testid="centroid-marker"
          />
        )}
      </MapContainer>
      {centroid && (
        <p data-testid="coverage-counter">
          {centroid.count} of {participants.length} participants included in fair center
        </p>
      )}
    </div>
  );
}

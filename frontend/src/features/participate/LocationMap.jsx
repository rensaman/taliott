import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's broken default icon paths when bundled with Vite
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
const DEFAULT_ZOOM = REGION.locationMapZoom;

function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, DEFAULT_ZOOM);
  }, [center, map]);
  return null;
}

function DraggableMarker({ position, onLocationChange }) {
  const markerRef = useRef(null);
  return (
    <Marker
      position={position}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;
          if (marker) {
            const { lat, lng } = marker.getLatLng();
            onLocationChange({ lat, lng });
          }
        },
      }}
    />
  );
}

export default function LocationMap({ location, onLocationChange, readonly = false }) {
  const center = location ? [location.lat, location.lng] : DEFAULT_CENTER;

  return (
    <div data-testid="location-map">
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: '300px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFlyTo center={location ? [location.lat, location.lng] : null} />
        {location && (
          readonly
            ? <Marker position={[location.lat, location.lng]} />
            : <DraggableMarker position={[location.lat, location.lng]} onLocationChange={onLocationChange} />
        )}
      </MapContainer>
    </div>
  );
}

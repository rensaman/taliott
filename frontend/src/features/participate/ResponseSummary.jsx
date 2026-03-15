import AvailabilityGrid from './AvailabilityGrid.jsx';
import LocationMap from './LocationMap.jsx';
import { TRAVEL_MODE_LABELS } from './TravelModeSelector.jsx';
import '../setup/EventSetupForm.css';
import './ResponseWizard.css';

export default function ResponseSummary({
  participantId,
  name,
  slots,
  availability,
  location,
  travelMode,
  locked,
  onUpdate,
}) {
  return (
    <section aria-label="Your response">
      {name && <p data-testid="summary-name">{name}</p>}

      <AvailabilityGrid
        participantId={participantId}
        slots={slots}
        initialAvailability={availability}
        locked={true}
      />

      {travelMode && (
        <p data-testid="summary-travel-mode">
          {TRAVEL_MODE_LABELS[travelMode] ?? travelMode}
        </p>
      )}

      {location && (
        <div>
          <p data-testid="summary-address">{location.label}</p>
          <LocationMap location={location} onLocationChange={() => {}} readonly />
        </div>
      )}

      {!locked && (
        <button className="btn btn-ghost" onClick={onUpdate} data-testid="update-response-btn">
          ← Update response
        </button>
      )}
    </section>
  );
}

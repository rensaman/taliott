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
    <section aria-label="Your response" className="summary">
      {name && (
        <div className="summary-section">
          <p className="summary-label">Name</p>
          <p data-testid="summary-name" className="summary-value">{name}</p>
        </div>
      )}

      <div className="summary-section">
        <p className="summary-label">Availability</p>
        <AvailabilityGrid
          participantId={participantId}
          slots={slots}
          initialAvailability={availability}
          locked={true}
        />
      </div>

      {(travelMode || location) && (
        <div className="summary-section">
          <p className="summary-label">Getting there</p>
          {travelMode && (
            <p data-testid="summary-travel-mode" className="summary-value">
              {TRAVEL_MODE_LABELS[travelMode] ?? travelMode}
            </p>
          )}
          {location && (
            <>
              <p data-testid="summary-address" className="summary-address">{location.label}</p>
              <LocationMap location={location} onLocationChange={() => {}} readonly />
            </>
          )}
        </div>
      )}

      {!locked && (
        <div className="summary-section summary-section--action">
          <button className="btn btn-ghost" onClick={onUpdate} data-testid="update-response-btn">
            ← Update response
          </button>
        </div>
      )}
    </section>
  );
}

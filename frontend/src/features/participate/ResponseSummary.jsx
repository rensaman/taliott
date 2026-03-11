import AvailabilityGrid from './AvailabilityGrid.jsx';
import LocationMap from './LocationMap.jsx';

export default function ResponseSummary({
  participantId,
  name,
  slots,
  availability,
  location,
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

      {location && (
        <div>
          <p data-testid="summary-address">{location.label}</p>
          <LocationMap location={location} onLocationChange={() => {}} readonly />
        </div>
      )}

      {!locked && (
        <button onClick={onUpdate} data-testid="update-response-btn">
          Update response
        </button>
      )}
    </section>
  );
}

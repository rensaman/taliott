import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeadlineBadge from './DeadlineBadge.jsx';
import ResponseWizard from './ResponseWizard.jsx';
import ResponseSummary from './ResponseSummary.jsx';
import FeedbackForm from '../feedback/FeedbackForm.jsx';
import { track } from '../../lib/analytics.js';
import './ResponseWizard.css';

export default function ParticipateView({ participantId }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [dataDeleted, setDataDeleted] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    fetch(`/api/participate/${participantId}`)
      .then(res => {
        if (!res.ok) throw new Error(t('participate.notFound'));
        return res.json();
      })
      .then(d => setData(d))
      .catch(err => setError(err.message));
  }, [participantId]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>{t('participate.loading')}</p>;

  const { event, slots, availability, participant, finalSlot, finalVenue } = data;

  const location =
    participant.latitude != null && participant.longitude != null
      ? { lat: participant.latitude, lng: participant.longitude, label: participant.address_label }
      : null;

  const travelMode = participant.travel_mode ?? 'transit';

  const showWizard = !event.locked && (!participant.responded_at || updating);

  async function handleExport() {
    const res = await fetch(`/api/participate/${participantId}/export`);
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-taliott-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!window.confirm(t('participate.deleteConfirm'))) return;
    const res = await fetch(`/api/participate/${participantId}`, { method: 'DELETE' });
    if (res.ok) setDataDeleted(true);
  }

  async function handleComplete() {
    track('availability_submitted');
    const res = await fetch(`/api/participate/${participantId}`).catch(() => null);
    if (res?.ok) {
      setData(await res.json());
    } else {
      setData(prev => ({
        ...prev,
        participant: { ...prev.participant, responded_at: new Date().toISOString() },
      }));
    }
    setUpdating(false);
    setJustCompleted(true);
  }

  const dataRightsSection = (
    <section aria-label="Privacy and data" className="pv-data-rights">
      <button className="pv-data-rights-btn" onClick={handleExport}>{t('participate.downloadData')}</button>
      {!dataDeleted && (
        <button className="pv-data-rights-btn" onClick={handleDelete}>{t('participate.deleteData')}</button>
      )}
      {dataDeleted && (
        <p className="pv-erased" role="status">{t('participate.dataErased')}</p>
      )}
    </section>
  );

  if (showWizard) {
    return (
      <>
        <header className="pv-wizard-event-header">
          <h1 className="pv-event-title">{event.name}</h1>
          <DeadlineBadge deadline={event.deadline} locked={event.locked} />
        </header>
        <ResponseWizard
          participantId={participantId}
          initialName={participant.name}
          slots={slots}
          initialAvailability={availability}
          initialLocation={location}
          initialTravelMode={travelMode}
          onComplete={handleComplete}
        />
        {dataRightsSection}
      </>
    );
  }

  return (
    <main className="pv-main">
      <h1 className="pv-event-title">{event.name}</h1>
      <DeadlineBadge deadline={event.deadline} locked={event.locked} />

      {event.locked && (
        <p role="status">{t('participate.resultsOnly')}</p>
      )}

      {finalSlot && (
        <section aria-label="Event result" data-testid="finalized-banner">
          <h2>{t('participate.eventFinalized')}</h2>
          <p>{t('participate.finalizedWhen', { date: new Date(finalSlot.starts_at).toLocaleString() })}</p>
          {finalVenue && (
            <p>
              {t('participate.finalizedWhere', { venue: finalVenue.name + (finalVenue.address ? `, ${finalVenue.address}` : '') })}
            </p>
          )}
        </section>
      )}

      <ResponseSummary
        participantId={participantId}
        name={participant.name}
        slots={slots}
        availability={availability}
        location={location}
        travelMode={travelMode}
        locked={event.locked}
        onUpdate={() => setUpdating(true)}
      />

      {justCompleted && <FeedbackForm context="participant" />}

      {dataRightsSection}
    </main>
  );
}

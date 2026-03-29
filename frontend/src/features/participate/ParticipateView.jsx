import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeadlineBadge from './DeadlineBadge.jsx';
import ResponseWizard from './ResponseWizard.jsx';
import ResponseSummary from './ResponseSummary.jsx';
import ParticipationResult from './ParticipationResult.jsx';
import FeedbackForm from '../feedback/FeedbackForm.jsx';
import LegalFooter from '../legal/LegalFooter.jsx';
import { track } from '../../lib/analytics.js';
import './ResponseWizard.css';
import '../join/JoinView.css';

export default function ParticipateView({ participantId }) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [dataDeleted, setDataDeleted] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

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
    setExportError(null);
    try {
      const res = await fetch(`/api/participate/${participantId}/export`);
      if (!res.ok) { setExportError(t('participate.errorExport')); return; }
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-taliott-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t('participate.errorExport'));
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('participate.deleteConfirm'))) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/participate/${participantId}`, { method: 'DELETE' });
      if (res.ok) setDataDeleted(true);
      else setDeleteError(t('participate.errorDelete'));
    } catch {
      setDeleteError(t('participate.errorDelete'));
    }
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
      <button className="pv-data-rights-btn" onClick={handleExport} data-testid="download-data-btn">{t('participate.downloadData')}</button>
      {exportError && <p className="wizard-error" role="alert" data-testid="export-error">{exportError}</p>}
      {!dataDeleted && (
        <button className="pv-data-rights-btn" onClick={handleDelete} data-testid="delete-data-btn">{t('participate.deleteData')}</button>
      )}
      {deleteError && <p className="wizard-error" role="alert" data-testid="delete-error">{deleteError}</p>}
      {dataDeleted && (
        <p className="pv-erased" role="status" data-testid="data-erased-status">{t('participate.dataErased')}</p>
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
          eventTimezone={event.timezone ?? 'UTC'}
          onComplete={handleComplete}
        />
        {dataRightsSection}
        <LegalFooter />
      </>
    );
  }

  return (
    <>
      <header className="join-header">
        <a href="/" className="wizard-wordmark">{t('wizard.wordmark')}</a>
      </header>
      <main>
      <div className="pv-main">
        <h1 className="pv-event-title">{event.name}</h1>
        <DeadlineBadge deadline={event.deadline} locked={event.locked} />

        {event.locked && (
          <p role="status" data-testid="results-only-status">{t('participate.resultsOnly')}</p>
        )}
      </div>

      {participant.responded_at && (
        <div className="pv-main">
          <ResponseSummary
            name={participant.name}
            locked={event.locked}
            onUpdate={() => setUpdating(true)}
          />
        </div>
      )}

      {participant.responded_at && event.status !== 'finalized' && (
        <section className="admin-section" data-testid="pv-next-steps">
          <div className="pv-main">
            <div className="admin-section-title">{t('participate.review.nextHeading')}</div>
            <ol className="pv-next-steps-list">
              <li>{t('participate.review.next1')}</li>
              <li>{t('participate.review.next2')}</li>
              <li>{t('participate.review.next3')}</li>
            </ol>
          </div>
        </section>
      )}

      {finalSlot && (
        <section aria-label="Event result" data-testid="finalized-banner" className="pv-main">
          <div className="finalized-result-card">
            <div className="finalized-result-label">{t('participate.eventFinalized')}</div>
            <div className="finalized-result-row">
              <span className="finalized-result-key">{t('participate.finalizedWhenLabel')}</span>
              <span className="finalized-result-value">{new Date(finalSlot.starts_at).toLocaleString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {finalVenue && (
              <div className="finalized-result-row">
                <span className="finalized-result-key">{t('participate.finalizedWhereLabel')}</span>
                <span className="finalized-result-value">{finalVenue.name}{finalVenue.address ? `, ${finalVenue.address}` : ''}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {participant.responded_at && (
        <ParticipationResult
          participants={data.participants || []}
          slots={slots}
          centroid={data.centroid}
        />
      )}

      <div className="pv-main">
        {justCompleted && <FeedbackForm context="participant" />}

        {justCompleted && (
          <p className="donate-nudge">
            {t('donate.text')}{' '}
            <a href="https://www.donably.com/taliott" target="_blank" rel="noopener noreferrer">
              {t('donate.link')}
            </a>
          </p>
        )}

        {dataRightsSection}
      </div>
    </main>
      <LegalFooter />
    </>
  );
}

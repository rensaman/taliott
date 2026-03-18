import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ParticipantResponseList from './ParticipantResponseList.jsx';
import GroupMap from './GroupMap.jsx';
import VenueList from './VenueList.jsx';
import FinalizePanel from './FinalizePanel.jsx';
import { useEventStream } from '../../hooks/useEventStream.js';
import './AdminView.css';

function scoreSlots(slots, participants) {
  const responded = participants.filter(p => p.responded_at);
  return slots
    .map(slot => {
      let yes = 0, maybe = 0, no = 0;
      for (const p of responded) {
        const avail = p.availability?.find(a => a.slot_id === slot.id);
        const state = avail?.state ?? 'neutral';
        if (state === 'yes') yes++;
        else if (state === 'maybe') maybe++;
        else if (state === 'no') no++;
      }
      return { ...slot, yes, maybe, no, respondedCount: responded.length };
    })
    .sort((a, b) => (b.yes * 2 + b.maybe) - (a.yes * 2 + a.maybe));
}

export default function AdminView({ adminToken }) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [error, setError] = useState(null);
  const [liveCentroid, setLiveCentroid] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const loadDashboard = useCallback(() => {
    fetch(`/api/events/${adminToken}`)
      .then(res => {
        if (!res.ok) throw new Error(t('admin.errorNotFound'));
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message));
  }, [adminToken, t]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (data?.centroid !== undefined) setLiveCentroid(data.centroid);
  }, [data?.centroid]);

  useEventStream(adminToken ?? null, msg => {
    if (msg.type === 'location') setLiveCentroid(msg.centroid);
  });

  async function handleDeleteEvent() {
    if (!window.confirm(t('admin.deleteConfirm'))) return;
    const res = await fetch(`/api/events/${adminToken}`, { method: 'DELETE' });
    if (res.ok) {
      window.location.assign('/');
    } else {
      setDeleteError(t('admin.deleteError'));
    }
  }

  const scoredSlots = useMemo(() => {
    if (!data) return [];
    return scoreSlots(data.slots || [], data.participants || []);
  }, [data]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>{t('admin.loading')}</p>;

  const responded = data.participants.filter(p => p.responded_at).length;
  const total = data.participants.length;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <a href="/" className="admin-wordmark">{t('admin.wordmark')}</a>
        <h1 className="admin-event-name">{data.name}</h1>
        <span className={`admin-status-badge admin-status-badge--${data.status}`}>
          {data.status}
        </span>
      </header>

      <div className="admin-meta">
        <span>{t('admin.deadlineLabel')} <strong>{new Date(data.deadline).toLocaleString(i18n.language)}</strong></span>
        <span><strong>{t('admin.responded', { responded, total })}</strong></span>
      </div>

      <div className="admin-body">
        <div className="admin-left">
          <div className="admin-section">
            <GroupMap
              centroid={liveCentroid}
              participants={data.participants}
              selectedVenue={selectedVenue ? { lat: selectedVenue.latitude, lng: selectedVenue.longitude, name: selectedVenue.name } : null}
            />
          </div>
          <div className="admin-section">
            <div className="admin-section-title">{t('admin.sectionParticipants')}</div>
            <ParticipantResponseList
              participants={data.participants}
              slots={data.slots || []}
            />
          </div>
        </div>

        <div className="admin-right">
          {data.status !== 'finalized' && (
            <FinalizePanel
              adminToken={adminToken}
              slots={data.slots || []}
              scoredSlots={scoredSlots}
              selectedVenueId={selectedVenue?.id ?? null}
              selectedVenueName={selectedVenue?.name ?? null}
              onFinalized={loadDashboard}
            />
          )}

          <VenueList
            adminToken={adminToken}
            defaultVenueType={data.venue_type || ''}
            onSelectVenue={setSelectedVenue}
          />

          {data.status === 'finalized' && (
            <div className="finalized-notice">
              <div className="finalized-notice-inner">
                <p data-testid="finalized-notice"><strong>{t('admin.finalizedNotice')}</strong></p>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="admin-danger" aria-label="Danger zone">
        <button className="btn-danger" onClick={handleDeleteEvent} data-testid="delete-event-btn">{t('admin.deleteEvent')}</button>
        {deleteError && <p role="alert" className="admin-error-danger">{deleteError}</p>}
      </footer>
    </div>
  );
}

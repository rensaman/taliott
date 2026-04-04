import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ParticipantResponseList from './ParticipantResponseList.jsx';
import GroupMap from './GroupMap.jsx';
import VenueList from './VenueList.jsx';
import FinalizePanel from './FinalizePanel.jsx';
import FinalizedSummary from './FinalizedSummary.jsx';
import LegalFooter from '../legal/LegalFooter.jsx';
import { useEventStream } from '../../hooks/useEventStream.js';
import './AdminView.css';

// UX-10: compute slot scores and mark tied slots
function scoreSlots(slots, participants) {
  const responded = participants.filter(p => p.responded_at);
  const scored = slots
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

  if (responded.length === 0) return scored;

  const scoreOf = s => s.yes * 2 + s.maybe;
  const counts = scored.reduce((acc, s) => {
    const sc = scoreOf(s);
    acc[sc] = (acc[sc] || 0) + 1;
    return acc;
  }, {});
  return scored.map(s => ({ ...s, tied: counts[scoreOf(s)] > 1 }));
}

export default function AdminView({ adminToken }) {
  const { t, i18n } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [data, setData] = useState(null);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [error, setError] = useState(null);
  const [liveCentroid, setLiveCentroid] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [justFinalized, setJustFinalized] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false); // UX-7
  const [linkCopied, setLinkCopied] = useState(false); // UX-8

  const loadDashboard = useCallback((signal) => {
    setError(null);
    fetch(`/api/events/${adminToken}`, signal ? { signal } : undefined)
      .then(res => {
        if (!res.ok) throw new Error(t('admin.errorNotFound'));
        return res.json();
      })
      .then(setData)
      .catch(err => {
        if (err?.name === 'AbortError') return;
        setError(err.message);
      });
  }, [adminToken, t]);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    if (data?.centroid !== undefined) setLiveCentroid(data.centroid);
  }, [data?.centroid]);

  useEventStream(adminToken ?? null, msg => {
    if (msg.type === 'location') setLiveCentroid(msg.centroid);
  });

  function handleVenueClick(id) {
    const venue = venues.find(v => v.id === id) ?? null;
    setSelectedVenue(venue);
  }

  // UX-7: show styled dialog instead of window.confirm
  function handleDeleteEvent() {
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteEvent() {
    setDeleteConfirmOpen(false);
    const res = await fetch(`/api/events/${adminToken}`, { method: 'DELETE' });
    if (res.ok) {
      window.location.assign('/');
    } else {
      setDeleteError(t('admin.deleteError'));
    }
  }

  // UX-4: resend invite to a pending participant
  const handleResendInvite = useCallback(async (participantId) => {
    try {
      const res = await fetch(`/api/events/${adminToken}/participants/${participantId}/resend-invite`, {
        method: 'POST',
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [adminToken]);

  // UX-8: copy join link to clipboard
  function handleCopyJoinLink() {
    navigator.clipboard.writeText(data.join_url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      // clipboard not available — silent fail
    });
  }

  const scoredSlots = useMemo(() => {
    if (!data) return [];
    return scoreSlots(data.slots || [], data.participants || []);
  }, [data]);

  // UX-3: thank-you screen with "View finalized event" link
  if (justFinalized) return (
    <div className="admin-page">
      <header className="admin-header">
        <a href="/" className="admin-wordmark">{t('admin.wordmark')}<span className="beta-badge">beta</span></a>
      </header>
      <div className="finalized-thankyou" data-testid="finalized-thankyou">
        <h1>{t('admin.justFinalizedTitle')}</h1>
        <p>{t('admin.justFinalizedBody')}</p>
        <a href="/" className="btn btn-primary">{t('admin.justFinalizedHome')}</a>
        <a href={window.location.pathname} className="btn btn-secondary" data-testid="view-finalized-link">
          {t('admin.justFinalizedView')}
        </a>
      </div>
      <LegalFooter />
    </div>
  );

  if (error) return (
    <div className="admin-page">
      <header className="admin-header">
        <a href="/" className="admin-wordmark">{t('admin.wordmark')}<span className="beta-badge">beta</span></a>
      </header>
      <div className="admin-error-page">
        <p role="alert">{error}</p>
        <button className="btn btn-secondary" onClick={() => loadDashboard()}>{t('admin.retry')}</button>
      </div>
      <LegalFooter />
    </div>
  );
  if (!data) return <p>{t('admin.loading')}</p>;

  const responded = data.participants.filter(p => p.responded_at).length;
  const total = data.participants.length;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <a href="/" className="admin-wordmark">{t('admin.wordmark')}<span className="beta-badge">beta</span></a>
        <div className="admin-name-badge">
          <h1 className="admin-event-name">{data.name}</h1>
          <span className={`admin-status-badge admin-status-badge--${data.status}`}>
            {t(`admin.status.${data.status}`)}
          </span>
        </div>
      </header>

      <div className="admin-meta">
        <span>{t('admin.deadlineLabel')} <strong>{new Date(data.deadline).toLocaleString(i18n.language)}</strong></span>
        <span><strong>{t('admin.responded', { responded, total })}</strong></span>
      </div>

      {/* UX-8: join link bar for shared-link events */}
      {data.invite_mode === 'shared_link' && data.join_url && (
        <div className="admin-join-link" data-testid="join-link-bar">
          <span>{t('admin.joinLinkLabel')}</span>
          <code>{data.join_url}</code>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopyJoinLink}
            data-testid="copy-join-link-btn"
          >
            {linkCopied ? t('admin.joinLinkCopied') : t('admin.copyJoinLink')}
          </button>
        </div>
      )}

      <div className="admin-body">
        <div className="admin-section">
          <div className="admin-section-title" data-testid="map-venue-section-title">{t('admin.sectionMapVenues')}</div>
        </div>
        <div className={`admin-map-venue-band${data.status === 'finalized' ? ' admin-map-venue-band--finalized' : ''}`}>
          <div className="admin-map-col">
            <GroupMap
              centroid={liveCentroid}
              participants={data.participants}
              venues={venues}
              selectedVenueId={selectedVenue?.id ?? null}
              onVenueClick={handleVenueClick}
            />
          </div>
          {data.status !== 'finalized' && (
            <div className="admin-venue-col">
              <VenueList
                adminToken={adminToken}
                defaultVenueType={data.venue_type || ''}
                selectedId={selectedVenue?.id ?? null}
                onSelectVenue={setSelectedVenue}
                onVenuesLoaded={setVenues}
              />
            </div>
          )}
        </div>

        <div className="admin-section">
          <div className="admin-section-title">{t('admin.sectionParticipants')}</div>
          <ParticipantResponseList
            participants={data.participants}
            slots={data.slots || []}
            inviteMode={data.invite_mode}
            onResendInvite={data.status !== 'finalized' ? handleResendInvite : undefined}
          />
        </div>

        {data.status !== 'finalized' && (
          <FinalizePanel
            adminToken={adminToken}
            slots={data.slots || []}
            scoredSlots={scoredSlots}
            selectedVenueId={selectedVenue?.id ?? null}
            selectedVenueName={selectedVenue?.name ?? null}
            onFinalized={() => setJustFinalized(true)}
          />
        )}

        {data.status === 'finalized' && (
          <FinalizedSummary
            slots={data.slots || []}
            finalSlotId={data.final_slot_id}
            finalVenueName={data.final_venue_name}
            finalVenueAddress={data.final_venue_address}
            finalDurationMinutes={data.final_duration_minutes}
            finalNotes={data.final_notes}
          />
        )}
      </div>

      <footer className="admin-danger" aria-label="Danger zone">
        <button className="btn-danger" onClick={handleDeleteEvent} data-testid="delete-event-btn">{t('admin.deleteEvent')}</button>
        {deleteError && <p role="alert" className="admin-error-danger">{deleteError}</p>}
        {/* UX-7: styled delete confirmation dialog */}
        {deleteConfirmOpen && (
          <div
            role="dialog"
            aria-modal="true"
            data-testid="delete-confirm-dialog"
            className="delete-confirm-dialog"
          >
            <h3>{t('admin.deleteDialogTitle')}</h3>
            <p>{t('admin.deleteDialogBody')}</p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                data-testid="delete-cancel-btn"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                {t('admin.deleteDialogCancel')}
              </button>
              <button
                type="button"
                className="btn-danger"
                data-testid="delete-confirm-btn"
                onClick={confirmDeleteEvent}
              >
                {t('admin.deleteDialogConfirm')}
              </button>
            </div>
          </div>
        )}
      </footer>
      <LegalFooter />
    </div>
  );
}

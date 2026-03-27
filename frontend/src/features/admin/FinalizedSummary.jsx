import { useTranslation } from 'react-i18next';

export default function FinalizedSummary({
  slots,
  finalSlotId,
  finalVenueName,
  finalVenueAddress,
  finalDurationMinutes,
  finalNotes,
}) {
  const { t, i18n } = useTranslation();
  const slot = slots.find(s => s.id === finalSlotId);

  const slotDatetime = slot
    ? `${new Date(slot.starts_at).toLocaleString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} – ${new Date(slot.ends_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <section data-testid="finalized-summary" className="finalized-summary">
      <h2 className="finalized-summary-heading">{t('admin.finalizedSummaryHeading')}</h2>
      <dl className="finalized-summary-list">
        {slotDatetime && (
          <>
            <dt>{t('admin.finalizedWhen')}</dt>
            <dd>{slotDatetime}</dd>
          </>
        )}
        <dt>{t('finalize.venueLegend')}</dt>
        <dd>
          {finalVenueName
            ? finalVenueAddress ? `${finalVenueName}, ${finalVenueAddress}` : finalVenueName
            : t('admin.finalizedVenueNone')}
        </dd>
        {finalDurationMinutes && (
          <>
            <dt>{t('finalize.durationLegend')}</dt>
            <dd>{finalDurationMinutes} {t('admin.finalizedDurationUnit')}</dd>
          </>
        )}
        {finalNotes && (
          <>
            <dt>{t('finalize.notesLabel')}</dt>
            <dd>{finalNotes}</dd>
          </>
        )}
      </dl>
    </section>
  );
}

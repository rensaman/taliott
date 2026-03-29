import { useTranslation } from 'react-i18next';

export default function SlotScoreCard({ slot, rank, selected, onClick, totalSlots }) {
  const { t, i18n } = useTranslation();
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  const dateStr = start.toLocaleDateString(i18n.language, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeStr = `${start.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`;
  const hasData = slot.respondedCount > 0;

  return (
    <div
      data-testid={`slot-card-${slot.id}`}
      className={`slot-score-card${selected ? ' slot-score-card--selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      aria-pressed={selected}
    >
      {totalSlots !== 1 && (
        <span className="slot-score-rank">{slot.tied ? t('finalize.tieLabel') : `#${rank}`}</span>
      )}
      <div className="slot-score-datetime">
        <span className="slot-score-date">{dateStr}</span>
        <span className="slot-score-time">{timeStr}</span>
      </div>
      {hasData && (
        <div className="slot-score-bars">
          <span className="slot-score-bar slot-score-bar--yes">✓ {slot.yes}</span>
          <span className="slot-score-bar slot-score-bar--maybe">? {slot.maybe}</span>
          <span className="slot-score-bar slot-score-bar--no">✗ {slot.no}</span>
        </div>
      )}
    </div>
  );
}

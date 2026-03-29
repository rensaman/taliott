import { useTranslation } from 'react-i18next';

const STATE_SYMBOL = { yes: '✓', maybe: '?', no: '✗', neutral: '—' };
const DOT_CLASS = { yes: 'avail-dot--yes', maybe: 'avail-dot--maybe', no: 'avail-dot--no', neutral: 'avail-dot--neutral' };

export default function ParticipantResponseList({ participants, slots = [] }) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {/* UX-6: availability dot colour legend */}
      <div className="avail-legend" data-testid="avail-legend" aria-hidden="true">
        <span className="avail-dot avail-dot--yes" /> {t('admin.availLegendYes')}
        {'  '}
        <span className="avail-dot avail-dot--maybe" /> {t('admin.availLegendMaybe')}
        {'  '}
        <span className="avail-dot avail-dot--no" /> {t('admin.availLegendNo')}
      </div>
      <ul className="participant-list">
      {participants.map(p => {
        const responded = !!p.responded_at;
        return (
          <li
            key={p.id}
            className="participant-row"
            data-testid={`participant-${p.id}`}
            data-responded={responded ? 'true' : 'false'}
          >
            <span className="participant-email">{p.email}</span>
            <span className={`participant-status ${responded ? 'participant-status--responded' : 'participant-status--pending'}`}>
              {responded ? t('admin.statusResponded') : t('admin.statusPending')}
            </span>
            {responded && slots.length > 0 && (
              <div className="participant-avail-dots">
                {slots.map(s => {
                  const avail = p.availability?.find(a => a.slot_id === s.id);
                  const state = avail?.state ?? 'neutral';
                  return (
                    <span
                      key={s.id}
                      className={`avail-dot ${DOT_CLASS[state]}`}
                      title={`${new Date(s.starts_at).toLocaleString(i18n.language)}: ${state}`}
                    />
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
    </>
  );
}

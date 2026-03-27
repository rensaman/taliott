import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import GroupMap from '../admin/GroupMap.jsx';
import SlotScoreCard from '../admin/SlotScoreCard.jsx';
import '../admin/AdminView.css';

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

export default function ParticipationResult({ participants, slots, centroid, showNextSteps }) {
  const { t } = useTranslation();
  const scoredSlots = useMemo(() => scoreSlots(slots, participants), [slots, participants]);

  return (
    <>
      {showNextSteps && (
        <section className="admin-section" data-testid="pv-next-steps">
          <div className="admin-section-title">{t('participate.review.nextHeading')}</div>
          <ol className="pv-next-steps-list">
            <li>{t('participate.review.next1')}</li>
            <li>{t('participate.review.next2')}</li>
            <li>{t('participate.review.next3')}</li>
          </ol>
        </section>
      )}

      <div className="pv-group-map-wrap" data-testid="pv-group-map">
        <GroupMap centroid={centroid} participants={participants} />
      </div>

      {scoredSlots.length > 0 && (
        <section className="admin-section" data-testid="pv-slot-scores">
          <div className="admin-section-title">{t('participate.sectionSlots')}</div>
          <div className="slot-scorer">
            {scoredSlots.map((s, i) => (
              <SlotScoreCard key={s.id} slot={s} rank={i + 1} selected={false} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

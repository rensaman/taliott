import { useTranslation } from 'react-i18next';

export default function DeadlineBadge({ deadline, locked }) {
  const { t, i18n } = useTranslation();
  const formatted = new Date(deadline).toLocaleString(i18n.language);

  const msUntil = new Date(deadline) - Date.now();
  const urgency = !locked
    ? msUntil < 3_600_000 ? 'critical' : msUntil < 86_400_000 ? 'high' : null
    : null;

  return (
    <p
      data-testid="deadline-badge"
      data-urgency={urgency ?? undefined}
      className={urgency ? `deadline-badge--${urgency}` : undefined}
    >
      {locked
        ? t('deadlineBadge.closed', { date: formatted })
        : t('deadlineBadge.deadline', { date: formatted })}
    </p>
  );
}

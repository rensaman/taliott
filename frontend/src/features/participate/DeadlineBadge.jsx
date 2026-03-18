import { useTranslation } from 'react-i18next';

export default function DeadlineBadge({ deadline, locked }) {
  const { t, i18n } = useTranslation();
  const formatted = new Date(deadline).toLocaleString(i18n.language);
  return (
    <p data-testid="deadline-badge">
      {locked
        ? t('deadlineBadge.closed', { date: formatted })
        : t('deadlineBadge.deadline', { date: formatted })}
    </p>
  );
}

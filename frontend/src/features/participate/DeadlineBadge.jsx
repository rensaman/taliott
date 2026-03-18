import { useTranslation } from 'react-i18next';

export default function DeadlineBadge({ deadline, locked }) {
  const { t } = useTranslation();
  const formatted = new Date(deadline).toLocaleString();
  return (
    <p>
      {locked
        ? t('deadlineBadge.closed', { date: formatted })
        : t('deadlineBadge.deadline', { date: formatted })}
    </p>
  );
}

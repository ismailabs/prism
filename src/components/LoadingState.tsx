import { useTranslation } from 'react-i18next';

export function LoadingState() {
  const { t } = useTranslation();
  return <div className="loading-state" role="status" aria-busy="true">
    <span className="sr-only">{t('loading')}</span>
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-snapshot" />
    <div className="grid gap-5 md:grid-cols-2"><div className="skeleton skeleton-panel" /><div className="skeleton skeleton-panel" /></div>
  </div>;
}

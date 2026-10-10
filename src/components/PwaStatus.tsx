import { useSyncExternalStore, useState } from 'react';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { activateUpdate, installPwa, pwaServerSnapshot, pwaSnapshot, subscribePwa } from '@/lib/pwa';
import { useOnline } from '@/lib/connectivity';
export function OfflineScreen() {
  const { t } = useTranslation();
  const locale = useAppStore(s => s.locale);
  return <main className="grid min-h-screen place-items-center p-6"><section className="card max-w-lg space-y-4 p-6" aria-labelledby="offline-title"><p className="eyebrow">PRISM</p><h1 id="offline-title" className="text-2xl font-semibold">{t('offlineTitle')}</h1><p>{t('offlineDetail')}</p><p className="text-sm">{t('uncertainSave')}</p><label className="form-field">{t('language')}<select className="input" value={locale} onChange={e => useAppStore.getState().setLocale(e.target.value === 'ms' ? 'ms' : 'en')}><option value="en">English</option><option value="ms">Bahasa Melayu</option></select></label><button className="btn-secondary" onClick={() => window.location.reload()}>{t('retry')}</button></section></main>;
}
export function PwaStatus({ settings = false }: { settings?: boolean }) {
  const { t } = useTranslation();
  const { waiting, install, unavailable } = useSyncExternalStore(subscribePwa, pwaSnapshot, pwaServerSnapshot);
  const pending = useIsMutating();
  const client = useQueryClient();
  const online = useOnline();
  const [failed, setFailed] = useState(false);
  if (!settings && (!online || (!waiting && !install))) return null;
  return <section aria-label={t('appInstallation')} className={settings ? 'card space-y-3 p-6' : 'pwa-notice card space-y-3 p-4'}>
    <h2 className="font-semibold">{t('appInstallation')}</h2>
    {settings && <p className="text-sm">{t('installHelp')}</p>}
    {!settings && install && <button className="btn-secondary" onClick={() => void installPwa().catch(() => setFailed(true))}>{t('installApp')}</button>}
    {!settings && waiting && <><p role="status">{t('updateAvailable')}</p><p className="text-sm">{t('updateDetail')}</p><button className="btn-primary" disabled={pending > 0 || !online} onClick={() => { if (client.isMutating() === 0) activateUpdate(); }}>{pending > 0 ? t('saving') : t('updateApp')}</button></>}
    {(failed || (settings && unavailable)) && <p role="status">{t('pwaUnavailable')}</p>}
  </section>;
}

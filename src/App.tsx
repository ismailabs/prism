import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { MfaChallenge } from '@/components/auth/MfaChallenge';
import { PasswordRecovery } from '@/components/auth/PasswordRecovery';
import { LoadingState } from '@/components/LoadingState';
import { PublicHome } from '@/components/public/PublicHome';
import { useAuth } from '@/hooks/useAuth';
import { loginPath, navigatePath, pathTab, safeDestination } from '@/lib/routes';
import { useAppStore } from '@/store/useAppStore';

const Workspace = lazy(() => import('@/components/Workspace'));

export default function App() {
  const { user, loading, requiresMfa, authError, recovery, completeRecovery } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme, locale, activeTab, setActiveTab, personalization } = useAppStore();
  const [, setRouteRevision] = useState(0);
  // Supabase can consume callback parameters with replaceState without popstate.
  // Read the current URL on Auth renders as well as history navigation.
  const location = typeof window === 'undefined' ? { path: '/login', search: '' } : { path: window.location.pathname, search: window.location.search };
  const syncing = useRef(false);
  const params = new URLSearchParams(location.search);
  const callback = params.has('code') || params.get('recovery') === '1' || recovery;
  const publicPage = location.path === '/demo' || (location.path === '/' && !user && !callback);
  const known = publicPage || location.path === '/' || location.path === '/login' || pathTab(location.path);
  const allowed = user && !loading && !requiresMfa && !authError && !recovery;

  useEffect(() => {
    const sync = () => {
      const path = window.location.pathname;
      setRouteRevision(value => value + 1);
      const tab = pathTab(path) ?? (path === '/' ? useAppStore.getState().personalization.landingPage : null);
      if (tab) { syncing.current = true; setActiveTab(tab); syncing.current = false; }
    };
    sync();
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (syncing.current || state.activeTab === previous.activeTab) return;
      // State-driven navigation is used only inside the authenticated workspace.
      const path = state.activeTab === 'dashboard' ? '/dashboard' : `/${state.activeTab}`;
      if (window.location.pathname !== path) navigatePath(path);
    });
    window.addEventListener('popstate', sync);
    return () => { unsubscribe(); window.removeEventListener('popstate', sync); };
  }, [setActiveTab]);

  useEffect(() => {
    if (loading || callback || !known || publicPage) return;
    if (!user && pathTab(location.path)) {
      navigatePath(loginPath(location.path + location.search), true);
    } else if (allowed && location.path === '/login') {
      navigatePath(safeDestination(new URLSearchParams(location.search).get('next'), `/${personalization.landingPage}`), true);
    }
  }, [allowed, callback, known, loading, location.path, location.search, personalization.landingPage, publicPage, user]);
  useEffect(() => { void i18n.changeLanguage(locale); document.documentElement.lang = locale; }, [i18n, locale]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.accent = personalization.accent;
    document.documentElement.dataset.density = personalization.density;
    document.documentElement.dataset.motion = personalization.motion;
  }, [personalization.accent, personalization.density, personalization.motion]);
  useEffect(() => {
    document.title = publicPage ? (locale === 'ms' ? 'PRISM · Kejelasan kewangan, mengikut cara anda' : 'PRISM · Financial clarity, on your terms') : `P.R.I.S.M. · ${location.path === '/login' ? t('signIn') : t(activeTab)}`;
  }, [activeTab, locale, location.path, publicPage, t]);

  if (!known) return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><h1 className="text-2xl font-semibold">{t('notFound')}</h1><a className="text-link mt-4" href="/">{t('backHome')}</a></div></main>;
  if (publicPage) return <PublicHome demoOnly={location.path === '/demo'} />;
  if (loading) return <main className="grid min-h-screen place-items-center"><div className="w-full max-w-4xl p-6"><LoadingState /></div></main>;
  if (!user) return <main className="auth-layout">
    <aside className="auth-story">
      <a href="/" className="auth-brand"><img src="/prism.svg" width="38" height="38" alt="" /><span>PRISM<span className="brand-caption">{locale === 'ms' ? 'Kewangan peribadi' : 'Personal finance'}</span></span></a>
      <div className="auth-story-copy"><p className="eyebrow">{locale === 'ms' ? 'SEBUAH RUANG UNTUK WANG ANDA' : 'A SPACE FOR YOUR MONEY'}</p><h2>{locale === 'ms' ? 'Sedikit kejelasan. Lebih banyak kemungkinan.' : 'A little clarity. A lot more possibility.'}</h2><p>{locale === 'ms' ? 'Fahami perbelanjaan anda, rancang perkara yang penting dan lihat kemajuan anda.' : 'Understand your spending, make room for what matters, and see your progress.'}</p></div>
      <div className="prism-art" aria-hidden="true"><span /><span /><span /></div>
      <p className="auth-story-footer">{locale === 'ms' ? 'Pendapatan · Perbelanjaan · Perancangan' : 'Income · Spending · Plans'}</p>
    </aside>
    <div className="auth-form-side">
      <div className="auth-preferences"><select className="input" aria-label={t('language')} value={locale} onChange={event => useAppStore.getState().setLocale(event.target.value === 'ms' ? 'ms' : 'en')}><option value="en">English</option><option value="ms">Bahasa Melayu</option></select><select className="input" aria-label={t('theme')} value={theme} onChange={event => useAppStore.getState().setTheme(event.target.value as 'system' | 'light' | 'dark')}><option value="system">{t('system')}</option><option value="light">{t('light')}</option><option value="dark">{t('dark')}</option></select></div>
      <div className="auth-form"><AuthScreen /></div><a className="text-link mt-5" href="/">{t('backHome')}</a>
      <img src="/built-by-ismail.png" alt="Built by Ismail" className="auth-credit" />
    </div>
  </main>;
  if (requiresMfa || authError) return <main className="auth-shell"><MfaChallenge /></main>;
  if (recovery) return <main className="auth-shell"><div className="card p-7 max-w-lg"><PasswordRecovery reset onBack={completeRecovery} /></div></main>;
  if (location.path === '/login') return <main><LoadingState /></main>;
  return <Suspense fallback={<main><LoadingState /></main>}><Workspace key={user.id} /></Suspense>;
}

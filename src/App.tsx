import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CreditCard, LayoutDashboard, Layers3, LogOut, Plus, Settings, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { MfaChallenge } from '@/components/auth/MfaChallenge';
import { MfaSetup } from '@/components/auth/MfaSetup';
import { Transactions } from '@/components/Transactions';
import { ManageLists } from '@/components/ManageLists';
import { TransactionDialog } from '@/components/TransactionDialog';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, useFinanceRealtime, usePaymentMethods, useProfile, useTransactionMutations, useTransactions, useUpdateProfile } from '@/hooks/useFinanceData';
import { useAppStore } from '@/store/useAppStore';
import { fetchExchangeRates } from '@/services/currency';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/utils';
import type { Currency, Locale, Profile, Tab, Theme, Transaction } from '@/types';

const Dashboard = lazy(() => import('@/components/Dashboard').then(module => ({ default: module.Dashboard })));
const tabs = [
  { id: 'dashboard', icon: LayoutDashboard }, { id: 'transactions', icon: Wallet },
  { id: 'categories', icon: Layers3 }, { id: 'payments', icon: CreditCard },
  { id: 'settings', icon: Settings },
] as const;

function routeTab(): Tab | null {
  if (typeof window === 'undefined') return 'dashboard';
  const route = window.location.pathname.replace(/^\/+|\/+$/g, '');
  return route === '' ? 'dashboard' : tabs.find(tab => tab.id === route)?.id ?? null;
}

export default function App() {
  const { user, loading, requiresMfa, authError } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme, locale, activeTab, setActiveTab } = useAppStore();
  const [notFound, setNotFound] = useState(() => routeTab() === null);
  useEffect(() => {
    const sync = () => { const route = routeTab(); setNotFound(route === null); if (route) setActiveTab(route); };
    sync();
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (state.activeTab !== previous.activeTab) {
        const path = state.activeTab === 'dashboard' ? '/' : `/${state.activeTab}`;
        if (window.location.pathname !== path) window.history.pushState(null, '', path);
        setNotFound(false);
      }
    });
    window.addEventListener('popstate', sync);
    return () => { unsubscribe(); window.removeEventListener('popstate', sync); };
  }, [setActiveTab]);
  useEffect(() => { void i18n.changeLanguage(locale); document.documentElement.lang = locale; }, [i18n, locale]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => { document.title = `P.R.I.S.M. · ${t(activeTab)}`; }, [activeTab, t]);

  if (notFound) return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><h1 className="text-2xl font-semibold">{t('notFound')}</h1><a className="text-link mt-4" href="/">{t('backHome')}</a></div></main>;
  if (loading) return <main className="grid min-h-screen place-items-center"><p role="status">{t('loading')}</p></main>;
  if (!user) return <main className="auth-shell"><div className="auth-brand"><img src="/prism.svg" width="44" height="44" alt="" /><span>P.R.I.S.M.</span></div><div className="card w-full max-w-lg p-7 sm:p-10"><AuthScreen /></div><img src="/built-by-ismail.png" alt="Built by Ismail" className="block h-auto w-full max-w-[180px] object-contain" /></main>;
  if (requiresMfa || authError) return <main className="auth-shell"><MfaChallenge /></main>;
  return <Workspace key={user.id} />;
}

function Workspace() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const store = useAppStore();
  const transactions = useTransactions();
  const categories = useCategories();
  const payments = usePaymentMethods();
  const profile = useProfile();
  const mutations = useTransactionMutations();
  useFinanceRealtime();
  const [month, setMonth] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; });
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const rates = useQuery({ queryKey: ['exchange-rates', store.currency], queryFn: () => fetchExchangeRates(store.currency), staleTime: 60 * 60 * 1000, refetchInterval: 60 * 60 * 1000 });
  useEffect(() => {
    if (!profile.data) return;
    store.setCurrency(profile.data.currency); store.setLocale(profile.data.language); store.setTheme(profile.data.theme);
  }, [profile.data?.currency, profile.data?.language, profile.data?.theme, store.setCurrency, store.setLocale, store.setTheme]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const requireAuth = (action: () => void) => { if (!online) toast.error(t('offline')); else action(); };
  const add = () => requireAuth(() => { setEditing(null); setDialogOpen(true); });
  const edit = (transaction: Transaction) => requireAuth(() => { setEditing(transaction); setDialogOpen(true); });
  async function remove() {
    if (!deleting) return;
    try { await mutations.remove.mutateAsync(deleting.id); setDeleting(null); toast.success(t('deleted')); }
    catch (error) { toast.error(errorMessage(error)); }
  }
  async function logout() {
    setSigningOut(true);
    try { await signOut(); } catch (error) { toast.error(errorMessage(error)); } finally { setSigningOut(false); }
  }
  const dataError = transactions.error || categories.error || payments.error || profile.error;
  const pending = transactions.isPending || categories.isPending || payments.isPending || profile.isPending;
  const data = { transactions: transactions.data ?? [], categories: categories.data ?? [], payments: payments.data ?? [] };
  const title = store.activeTab === 'dashboard' ? 'overviewTitle' : store.activeTab === 'transactions' ? 'allTransactions' : store.activeTab;
  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="/" onClick={event => { event.preventDefault(); store.setActiveTab('dashboard'); }}><img src="/prism.svg" alt="" width="34" height="34" />P.R.I.S.M.</a><div className="flex min-w-0 items-center gap-3"><button className="min-w-0 max-w-20 truncate sm:max-w-44 text-sm font-medium" onClick={() => store.setActiveTab('settings')}>{profile.data?.username || user?.email}</button><Button variant="ghost" aria-label={t('signOut')} disabled={signingOut} onClick={() => void logout()}><LogOut size={16} /><span className="hidden sm:inline">{t('signOut')}</span></Button></div></header>
    <nav className="app-nav" aria-label={t('workspace')}>{tabs.map(({ id, icon: Icon }) => <a href={id === 'dashboard' ? '/' : `/${id}`} key={id} aria-current={store.activeTab === id ? 'page' : undefined} onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); store.setActiveTab(id); }}><Icon size={17} />{t(id)}</a>)}</nav>
    <main id="main-content" className="app-main"><div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow mb-2">{t('personalWorkspace')}</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(title)}</h1></div><div className="flex flex-wrap items-center gap-3">{store.activeTab === 'dashboard' && <label className="form-field">{t('month')}<input className="input" type="month" value={month} onChange={event => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) setMonth(event.target.value); }} /></label>}{(store.activeTab === 'dashboard' || store.activeTab === 'transactions') && <Button onClick={add} disabled={pending || !!dataError}><Plus size={16} />{t('addTransaction')}</Button>}</div></div>
      {!online && <p className="warning-message mb-5" role="status">{t('offline')}</p>}
      {rates.error && <p className="warning-message mb-5" role="status">{t('ratesUnavailable')}</p>}
      {dataError ? <section className="card p-7" role="alert"><h2 className="font-semibold">{t('errorTitle')}</h2><p className="my-3 text-sm">{errorMessage(dataError)}</p><Button onClick={() => void Promise.all([transactions.refetch(), categories.refetch(), payments.refetch(), profile.refetch()])}>{t('retry')}</Button></section> : pending ? <p role="status">{t('loading')}</p> : <Suspense fallback={<p role="status">{t('loading')}</p>}>
        {store.activeTab === 'dashboard' && <Dashboard {...data} month={month} onEdit={edit} onDelete={setDeleting} />}
        {store.activeTab === 'transactions' && <Transactions {...data} search={search} setSearch={setSearch} onEdit={edit} onDelete={setDeleting} />}
        {(store.activeTab === 'categories' || store.activeTab === 'payments') && <ManageLists key={store.activeTab} {...data} kind={store.activeTab} requireAuth={requireAuth} />}
        {store.activeTab === 'settings' && profile.data && <SettingsView profile={profile.data} />}
      </Suspense>}
      {rates.data && <p className="mt-8 text-xs text-subtle">{t('rateSource')}: {rates.data.source} · {new Date(rates.data.updatedAt).toLocaleDateString(store.locale === 'ms' ? 'ms-MY' : 'en-US')}</p>}
    </main>
    <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} categories={data.categories} payments={data.payments} />
    <Modal open={!!deleting} onOpenChange={open => { if (!open && !mutations.remove.isPending) setDeleting(null); }} title={t('deleteTransaction')} description={t('deleteWarning')}><p className="mb-6">{deleting?.description}</p><div className="modal-actions"><Button variant="outline" disabled={mutations.remove.isPending} onClick={() => setDeleting(null)}>{t('cancel')}</Button><Button variant="destructive" disabled={mutations.remove.isPending || !online} onClick={() => void remove()}>{t('delete')}</Button></div></Modal>
  </div>;
}

function SettingsView({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const update = useUpdateProfile();
  const [username, setUsername] = useState(profile.username);
  const [currency, setCurrency] = useState<Currency>(profile.currency);
  const [language, setLanguage] = useState<Locale>(profile.language);
  const [theme, setTheme] = useState<Theme>(profile.theme);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    try { await update.mutateAsync({ username: username.trim(), currency, language, theme }); toast.success(t('saved')); }
    catch (cause) { setError(errorMessage(cause)); }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await supabase.auth.updateUser({ password }); if (result.error) throw result.error; setPassword(''); toast.success(t('passwordUpdated')); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }
  return <div className="grid gap-6 lg:grid-cols-2"><form className="card space-y-5 p-6" onSubmit={event => void save(event)}><h2 className="text-lg font-semibold">{t('profile')}</h2><label className="form-field">{t('email')}<input className="input" type="email" value={user?.email ?? ''} readOnly /></label><label className="form-field">{t('username')}<input className="input" required maxLength={60} value={username} onChange={event => setUsername(event.target.value)} /></label><h3 className="font-semibold">{t('preferences')}</h3><label className="form-field">{t('currency')}<select className="input" value={currency} onChange={event => setCurrency(event.target.value as Currency)}>{['USD','EUR','JPY','MYR'].map(value => <option key={value}>{value}</option>)}</select></label><label className="form-field">{t('language')}<select className="input" value={language} onChange={event => setLanguage(event.target.value as Locale)}><option value="en">English</option><option value="ms">Bahasa Melayu</option></select></label><div className="space-y-2"><h3 className="font-semibold">{t('theme')}</h3><div className="appearance-selector"><span className="text-sm font-medium">{t('mode')}</span><div className="appearance-options" role="group" aria-label={t('theme')}>{(['system','light','dark'] as const).map(value => <button key={value} type="button" className={'appearance-option ' + (theme === value ? 'selected' : '')} aria-label={t(value)} title={t(value)} aria-pressed={theme === value} onClick={() => setTheme(value)}><span className={'appearance-preview ' + value} aria-hidden="true"><i /><i /><i /></span><span>{t(value)}</span></button>)}</div></div></div><Button disabled={update.isPending || !username.trim()}>{update.isPending ? t('saving') : t('save')}</Button></form><div className="space-y-6"><section className="card space-y-6 p-6"><h2 className="text-lg font-semibold">{t('security')}</h2><p className="text-sm text-subtle">{t('securityDescription')}</p><MfaSetup /><form className="space-y-4 border-t border-border pt-6" onSubmit={event => void changePassword(event)}><label className="form-field">{t('newPassword')}<input className="input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label><Button disabled={busy}>{t('updatePassword')}</Button></form>{error && <p className="error-message" role="alert">{error}</p>}</section><section className="card p-6"><h2 className="text-lg font-semibold">{t('credits')}</h2><img src="/built-by-ismail.png" alt="Built by Ismail" className="mx-auto mt-4 block h-auto w-full max-w-xs object-contain" /></section></div></div>;
}



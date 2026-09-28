import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CreditCard, LayoutDashboard, Layers3, LogOut, Menu, Plus, Settings, Wallet, Landmark, Target, PiggyBank, HandCoins, X } from 'lucide-react';
import { toast } from 'sonner';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { MfaChallenge } from '@/components/auth/MfaChallenge';
import { MfaSetup } from '@/components/auth/MfaSetup';
import { Transactions } from '@/components/Transactions';
import { ManageLists } from '@/components/ManageLists';
import { TransactionDialog } from '@/components/TransactionDialog';
import { AccountsPage, AccountsSection, DebtsPage, FinancialOverview, ObjectivesPage } from '@/components/Platform';
import { usePlatformTable } from '@/hooks/usePlatformData';
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
  { id: 'accounts', icon: Landmark }, { id: 'goals', icon: Target }, { id: 'savings', icon: PiggyBank }, { id: 'debts', icon: HandCoins },
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
  const objectiveContributions = usePlatformTable('objective_contributions');
  const debtRepayments = usePlatformTable('debt_repayments');
  const mutations = useTransactionMutations();
  useFinanceRealtime();
  const [month, setMonth] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; });
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigationPanel = useRef<HTMLElement>(null);
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
  useEffect(() => {
    if (!navigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = navigationPanel.current;
    const focusable = panel?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
    focusable?.[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setNavigationOpen(false); menuButton.current?.focus(); return; }
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); };
  }, [navigationOpen]);
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
  const navigate = (tab: Tab) => { store.setActiveTab(tab); setNavigationOpen(false); };
  const navigationLinks = (closeLabel = false) => tabs.map(({ id, icon: Icon }) => <a href={id === 'dashboard' ? '/' : `/${id}`} key={id} aria-current={store.activeTab === id ? 'page' : undefined} onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(id); }}><Icon size={17} />{t(id)}{closeLabel && store.activeTab === id && <span className="sr-only">, current page</span>}</a>);
  return <div className="app-shell">
    <header className="app-header"><div className="flex min-w-0 items-center gap-2"><Button ref={menuButton} className="sm:hidden" variant="ghost" size="icon" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="mobile-navigation" onClick={()=>setNavigationOpen(true)}><Menu size={20}/></Button><a className="brand" href="/" onClick={event => { event.preventDefault(); navigate('dashboard'); }}><img src="/prism.svg" alt="" width="34" height="34" />P.R.I.S.M.</a></div><div className="flex min-w-0 items-center gap-1 sm:gap-3"><button className="hidden min-w-0 max-w-20 truncate text-sm font-medium min-[420px]:block sm:max-w-44" onClick={() => navigate('settings')}>{profile.data?.username || user?.email}</button><Button variant="ghost" aria-label={t('signOut')} disabled={signingOut} onClick={() => void logout()}><LogOut size={16} /><span className="hidden sm:inline">{t('signOut')}</span></Button></div></header>
    <nav className="app-nav hidden sm:flex" aria-label={t('workspace')}>{navigationLinks()}</nav>
    {navigationOpen && <><button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={()=>{setNavigationOpen(false);menuButton.current?.focus();}}/><aside ref={navigationPanel} id="mobile-navigation" className="mobile-nav-panel" role="dialog" aria-modal="true" aria-label={t('workspace')}><div className="flex items-center justify-between border-b border-border px-4 py-4"><span className="brand"><img src="/prism.svg" alt="" width="30" height="30"/>P.R.I.S.M.</span><Button variant="ghost" size="icon" aria-label="Close navigation" onClick={()=>{setNavigationOpen(false);menuButton.current?.focus();}}><X size={20}/></Button></div><nav className="mobile-nav-links" aria-label={t('workspace')}>{navigationLinks(true)}</nav></aside></>}
    <main id="main-content" className="app-main"><div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow mb-2">{t('personalWorkspace')}</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(title)}</h1></div><div className="flex flex-wrap items-center gap-3">{store.activeTab === 'dashboard' && <label className="form-field">{t('month')}<input className="input" type="month" value={month} onChange={event => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) setMonth(event.target.value); }} /></label>}{(store.activeTab === 'dashboard' || store.activeTab === 'transactions') && <Button onClick={add} disabled={pending || !!dataError}><Plus size={16} />{t('addTransaction')}</Button>}</div></div>
      {!online && <p className="warning-message mb-5" role="status">{t('offline')}</p>}
      {rates.error && <p className="warning-message mb-5" role="status">{t('ratesUnavailable')}</p>}
      {dataError ? <section className="card p-7" role="alert"><h2 className="font-semibold">{t('errorTitle')}</h2><p className="my-3 text-sm">{errorMessage(dataError)}</p><Button onClick={() => void Promise.all([transactions.refetch(), categories.refetch(), payments.refetch(), profile.refetch()])}>{t('retry')}</Button></section> : pending ? <p role="status">{t('loading')}</p> : <Suspense fallback={<p role="status">{t('loading')}</p>}>
        {store.activeTab === 'dashboard' && <Dashboard {...data} month={month} onEdit={edit} onDelete={setDeleting} accountSummary={<FinancialOverview />} />}
        {store.activeTab === 'transactions' && <div className="space-y-7"><Transactions {...data} search={search} setSearch={setSearch} onEdit={edit} onDelete={setDeleting} /><AccountsSection /></div>}
        {store.activeTab === 'accounts' && <AccountsPage />}
        {store.activeTab === 'goals' && <ObjectivesPage kind="goal" />}
        {store.activeTab === 'savings' && <ObjectivesPage kind="savings" />}
        {store.activeTab === 'debts' && <DebtsPage />}
        {(store.activeTab === 'categories' || store.activeTab === 'payments') && <ManageLists key={store.activeTab} {...data} kind={store.activeTab} requireAuth={requireAuth} />}
        {store.activeTab === 'settings' && profile.data && <SettingsView profile={profile.data} />}
      </Suspense>}
      {rates.data && <p className="mt-8 text-xs text-subtle">{t('rateSource')}: {rates.data.source} · {new Date(rates.data.updatedAt).toLocaleDateString(store.locale === 'ms' ? 'ms-MY' : 'en-US')}</p>}
    </main>
    <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} categories={data.categories} payments={data.payments} />
    <Modal open={!!deleting} onOpenChange={open => { if (!open && !mutations.remove.isPending) setDeleting(null); }} title={t('deleteTransaction')} description={t('deleteWarning')}><p className="mb-3">{deleting?.description}</p>{deleting && ((objectiveContributions.data ?? []).some(c=>c.transaction_id===deleting.id) || (debtRepayments.data ?? []).some(r=>r.transaction_id===deleting.id)) && <p className="warning-message mb-5" role="alert">This transaction is linked to a goal, savings target, or debt. Deleting it also removes that contribution or repayment and recalculates progress.</p>}<div className="modal-actions"><Button variant="outline" disabled={mutations.remove.isPending} onClick={() => setDeleting(null)}>{t('cancel')}</Button><Button variant="destructive" disabled={mutations.remove.isPending || !online || objectiveContributions.isPending || debtRepayments.isPending} onClick={() => void remove()}>{t('delete')}</Button></div></Modal>
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const requiredConfirmation = `DELETE ${user?.email ?? ''}`;
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
  async function deletePrismAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setDeleteError('');
    if (deleteConfirmation !== requiredConfirmation) { setDeleteError(`Type ${requiredConfirmation} exactly.`); return; }
    setDeletingAccount(true);
    try {
      const { error: rpcError } = await supabase.rpc('delete_own_account', { confirmation: 'DELETE' });
      if (rpcError) throw rpcError;
      await supabase.auth.signOut({ scope: 'local' });
      window.location.replace('/');
    } catch (cause) {
      setDeleteError(errorMessage(cause));
      setDeletingAccount(false);
    }
  }
  return <div className="grid gap-6 lg:grid-cols-2">
    <form className="card space-y-5 p-6" onSubmit={event => void save(event)}><h2 className="text-lg font-semibold">{t('profile')}</h2><label className="form-field">{t('email')}<input className="input" type="email" value={user?.email ?? ''} readOnly /></label><label className="form-field">{t('username')}<input className="input" required maxLength={60} value={username} onChange={event => setUsername(event.target.value)} /></label><h3 className="font-semibold">{t('preferences')}</h3><label className="form-field">{t('currency')}<select className="input" value={currency} onChange={event => setCurrency(event.target.value as Currency)}>{['USD','EUR','JPY','MYR'].map(value => <option key={value}>{value}</option>)}</select></label><label className="form-field">{t('language')}<select className="input" value={language} onChange={event => setLanguage(event.target.value as Locale)}><option value="en">English</option><option value="ms">Bahasa Melayu</option></select></label><div className="space-y-2"><h3 className="font-semibold">{t('theme')}</h3><div className="appearance-selector"><span className="text-sm font-medium">{t('mode')}</span><div className="appearance-options" role="group" aria-label={t('theme')}>{(['system','light','dark'] as const).map(value => <button key={value} type="button" className={'appearance-option ' + (theme === value ? 'selected' : '')} aria-label={t(value)} title={t(value)} aria-pressed={theme === value} onClick={() => setTheme(value)}><span className={'appearance-preview ' + value} aria-hidden="true"><i /><i /><i /></span><span>{t(value)}</span></button>)}</div></div></div><Button disabled={update.isPending || !username.trim()}>{update.isPending ? t('saving') : t('save')}</Button></form>
    <div className="space-y-6"><section className="card space-y-6 p-6"><h2 className="text-lg font-semibold">{t('security')}</h2><p className="text-sm text-subtle">{t('securityDescription')}</p><MfaSetup /><form className="space-y-4 border-t border-border pt-6" onSubmit={event => void changePassword(event)}><label className="form-field">{t('newPassword')}<input className="input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label><Button disabled={busy}>{t('updatePassword')}</Button></form>{error && <p className="error-message" role="alert">{error}</p>}</section>
      <section className="card border-red-500/40 p-6"><p className="eyebrow text-red-600 dark:text-red-300">Account &amp; data</p><h2 className="mt-2 text-lg font-semibold">Danger zone</h2><p className="mt-3 text-sm text-subtle">Permanently delete your Prism account, authentication identity, and all owned financial data. This cannot be undone.</p><Button className="mt-5" variant="destructive" onClick={()=>{setDeleteConfirmation('');setDeleteError('');setDeleteOpen(true);}}>Delete Prism account</Button></section>
      <section className="card p-6"><h2 className="text-lg font-semibold">{t('credits')}</h2><img src="/built-by-ismail.png" alt="Built by Ismail" className="mx-auto mt-4 block h-auto w-full max-w-xs object-contain" /></section>
    </div>
    <Modal open={deleteOpen} onOpenChange={value=>{if(!deletingAccount)setDeleteOpen(value);}} title="Permanently delete your Prism account" description="This deletes your sign-in and every financial record owned by your account."><form className="space-y-5" onSubmit={event=>void deletePrismAccount(event)}><div className="error-message"><strong>This action is permanent.</strong><p className="mt-1">Accounts, transactions, goals, savings targets, debts, categories, payment methods, and progress history will be deleted.</p></div><label className="form-field">Type <span className="font-mono">{requiredConfirmation}</span> to confirm<input className="input" autoComplete="off" value={deleteConfirmation} onChange={event=>setDeleteConfirmation(event.target.value)} /></label>{deleteError&&<p className="error-message" role="alert">{deleteError}</p>}<div className="modal-actions"><Button type="button" variant="outline" disabled={deletingAccount} onClick={()=>setDeleteOpen(false)}>Cancel</Button><Button variant="destructive" disabled={deletingAccount||deleteConfirmation!==requiredConfirmation}>{deletingAccount?'Deleting account…':'Delete forever'}</Button></div></form></Modal>
  </div>;
}



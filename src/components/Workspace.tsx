import { SettingsView } from "@/components/financial/Settings";
import { BottomNavigation, navigationGroups, WorkspaceLinks } from './app-shell/Navigation';
import { pageDescriptions } from './app-shell/pageCopy';
import { Onboarding } from "@/components/financial/Onboarding";
import { PlanningHighlights } from '@/components/financial/PlanningHighlights';
import { Plans } from "@/components/financial/Planning";
import { ManageLists } from "@/components/ManageLists";
import { LoadingState } from "@/components/LoadingState";
import {
  AccountsPage,
  AccountsSection,
  DebtsPage,
  FinancialOverview,
  ObjectivesPage,
} from "@/components/Platform";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Transactions } from "@/components/Transactions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { browserTimezone } from "@/domain/dates";
import { useFinancialPeriod } from '@/hooks/useFinancialPeriod';
import { PeriodSelector, periodLabel } from '@/components/analytics/PeriodSelector';
import { useAuth } from "@/hooks/useAuth";
import {
  useCategories,
  useFinanceRealtime,
  usePaymentMethods,
  useProfile,
  useTransactionMutations,
  useTransactions,
} from "@/hooks/useFinanceData";
import { useFinancialReport } from "@/hooks/useFinancialReports";
import { usePlatformTable } from "@/hooks/usePlatformData";
import { errorMessage } from "@/lib/utils";
import { fetchExchangeRates } from "@/services/currency";
import { useAppStore } from "@/store/useAppStore";
import type { Tab, Transaction } from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Eye,
  EyeOff,
  LogOut,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AnalyticsBar } from "@/components/analytics/AnalyticsBar";
import { CommandPalette } from "@/components/CommandPalette";
import { useNavigationGestures } from "@/hooks/useNavigationGestures";

const Dashboard = lazy(() =>
  import("@/components/Dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
const Analytics = lazy(() => import('@/components/analytics/Analytics').then(module=>({default:module.Analytics})));
const AccountingLab = lazy(() => import('@/components/financial/AccountingLab'));
const Notes = lazy(() => import('@/components/financial/Notes'));
const Reminders = lazy(() => import('@/components/financial/Reminders'));
const Notifications = lazy(() => import('@/components/financial/Notifications'));
const Calendar = lazy(() => import('@/components/financial/Calendar'));
const ActionSourceContext = lazy(() => import('@/components/financial/ActionSourceContext'));

export default function Workspace() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const store = useAppStore();
  const { setCurrency, setLocale, setTheme, setFinancialTimezone } = store;
  const transactions = useTransactions();
  const categories = useCategories();
  const payments = usePaymentMethods();
  const profile = useProfile();
  const objectiveContributions = usePlatformTable("objective_contributions");
  const debtRepayments = usePlatformTable("debt_repayments");
  const mutations = useTransactionMutations();
  useFinanceRealtime();
  const { selection, period, setSelection } = useFinancialPeriod();
  const label = periodLabel(selection, store.locale, t);
  const report = useFinancialReport(period, store.personalization.analyticsBar || ['dashboard', 'analytics'].includes(store.activeTab));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [paletteOpen,setPaletteOpen]=useState(false);
  const [routeRevision,setRouteRevision]=useState(0);
  useNavigationGestures(navigationOpen,setNavigationOpen);
  useEffect(()=>{
    const media=window.matchMedia('(min-width: 768px)');
    const close=()=>{if(media.matches)setNavigationOpen(false);};
    media.addEventListener('change',close);
    return ()=>media.removeEventListener('change',close);
  },[]);
  useEffect(()=>{const update=()=>setRouteRevision(r=>r+1);window.addEventListener('popstate',update);return ()=>window.removeEventListener('popstate',update);},[]);
  useEffect(()=>{
    const keyboard=(event:KeyboardEvent)=>{
      const typing=(event.target as Element)?.closest('input,textarea,select,[contenteditable="true"]');
      if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='k'){if(document.querySelector('[role="dialog"]')&&!document.querySelector('#command-list'))return;event.preventDefault();setPaletteOpen(v=>!v);return;}
      if(typing||event.ctrlKey||event.metaKey||!event.altKey||document.querySelector('[role="dialog"]'))return;
      if(event.key.toLowerCase()==='n'){event.preventDefault();document.querySelector<HTMLButtonElement>('[data-quick-add]')?.click();}
      if(event.key.toLowerCase()==='p'){event.preventDefault();const state=useAppStore.getState();state.setPersonalization({privacyMode:!state.personalization.privacyMode});}
    };
    document.addEventListener('keydown',keyboard);return ()=>document.removeEventListener('keydown',keyboard);
  },[]);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigationOpener = useRef<HTMLButtonElement | null>(null);
  const navigationPanel = useRef<HTMLElement>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const rates = useQuery({
    queryKey: ["exchange-rates", store.currency],
    queryFn: () => fetchExchangeRates(store.currency),
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
  const savedCurrency = profile.data?.currency,
    savedLanguage = profile.data?.language,
    savedTheme = profile.data?.theme,
    savedTimezone = profile.data?.financial_timezone;
  useEffect(() => {
    if (!savedCurrency || !savedLanguage || !savedTheme) return;
    setCurrency(savedCurrency);
    setLocale(savedLanguage);
    setTheme(savedTheme);
    setFinancialTimezone(savedTimezone ?? browserTimezone());
  }, [
    savedCurrency,
    savedLanguage,
    savedTheme,
    savedTimezone,
    setCurrency,
    setLocale,
    setTheme,
    setFinancialTimezone,
  ]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!navigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = navigationOpener.current ?? menuButton.current;
    document.body.style.overflow = "hidden";
    const panel = navigationPanel.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      "a[href],button:not([disabled])",
    );
    focusable?.[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setNavigationOpen(false);
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      requestAnimationFrame(()=>returnFocus?.focus());
    };
  }, [navigationOpen]);
  const requireAuth = (action: () => void) => {
    if (!online) toast.error(t("offline"));
    else action();
  };
  const add = () =>
    requireAuth(() => {
      setEditing(null);
      setDialogOpen(true);
    });
  const edit = (transaction: Transaction) =>
    requireAuth(() => {
      setEditing(transaction);
      setDialogOpen(true);
    });
  async function remove() {
    if (!deleting) return;
    try {
      await mutations.remove.mutateAsync(deleting.id);
      setDeleting(null);
      toast.success(t("deleted"));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  async function logout() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSigningOut(false);
    }
  }
  const dataError =
    (store.activeTab === "dashboard" ? report.error : null) ||
    transactions.error ||
    categories.error ||
    payments.error ||
    profile.error;
  const pending =
    (store.activeTab === "dashboard" ? report.isPending : false) ||
    transactions.isPending ||
    categories.isPending ||
    payments.isPending ||
    profile.isPending;
  const data = {
    transactions: transactions.data ?? [],
    categories: categories.data ?? [],
    payments: payments.data ?? [],
  };
  const title =
    store.activeTab === "dashboard"
      ? "overviewTitle"
      : store.activeTab === "transactions"
        ? "allTransactions"
        : store.activeTab;
  const navigate = (tab: Tab) => {
    if(tab===store.activeTab && window.location.search){window.history.pushState(null,'',`/${tab}`);setRouteRevision(r=>r+1);}
    store.setActiveTab(tab);
    setNavigationOpen(false);
  };
  const groupedNavigation = () => navigationGroups.map(group => <div className="workspace-nav-group" key={group.en}><p className="eyebrow">{store.locale === 'ms' ? group.ms : group.en}</p><WorkspaceLinks items={group.items} active={store.activeTab} navigate={navigate}/></div>);
  const openNavigation = (opener: HTMLButtonElement) => { navigationOpener.current = opener; setNavigationOpen(true); };
  return (
    <div className={`app-shell ${store.personalization.sidebarCompact?'sidebar-compact':''}`}>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-3"
        href="#main-content"
      >
        {store.locale === "ms" ? "Langkau ke kandungan" : "Skip to content"}
      </a>
      <aside className="desktop-sidebar">
        <a className="brand sidebar-brand" href="/dashboard" onClick={event => { event.preventDefault(); navigate('dashboard'); }}><img src="/prism.svg" width="35" height="35" alt="" /><span>PRISM<span className="brand-caption">{store.locale === 'ms' ? 'Kewangan peribadi' : 'Personal finance'}</span></span></a>
        <nav className="sidebar-links" aria-label={t('workspace')}>{groupedNavigation()}</nav>
        <div className="sidebar-footer"><p>{store.locale === 'ms' ? 'Sedikit kejelasan, setiap hari.' : 'A little clarity, every day.'}</p><Button variant="ghost" disabled={signingOut} onClick={() => void logout()}><LogOut size={16} />{t('signOut')}</Button></div>
      </aside>
      <header className="app-header" inert={navigationOpen}>
        <div className="flex min-w-0 items-center gap-2">
          <Button
            ref={menuButton}
            className="md:hidden"
            variant="ghost"
            size="icon"
            aria-label={t("openNavigation")}
            aria-expanded={navigationOpen}
            aria-controls="mobile-navigation"
            onClick={event => openNavigation(event.currentTarget)}
          >
            <Menu size={20} />
          </Button>
          <a
            className="brand header-brand"
            href="/dashboard"
            onClick={(event) => {
              event.preventDefault();
              navigate("dashboard");
            }}
          >
            <img src="/prism.svg" alt="" width="34" height="34" />
            PRISM
          </a>
          <span className="header-context">{t('personalWorkspace')}<span>/</span><strong>{t(store.activeTab)}</strong></span>
        </div>
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="icon" aria-label={t('quickNavigation')} title={t('keyboardHint')} onClick={()=>setPaletteOpen(true)}><Search size={18}/></Button>
          <Button variant="ghost" size="icon" aria-label={t('privacyMode')} title={t(store.personalization.privacyMode?'privacyOn':'privacyOff')} aria-pressed={store.personalization.privacyMode} onClick={()=>store.setPersonalization({privacyMode:!store.personalization.privacyMode})}>{store.personalization.privacyMode?<EyeOff size={18}/>:<Eye size={18}/>}</Button>
          <span className="header-currency">{store.currency}</span>
          <button
            className="profile-button"
            aria-label={t('settings')}
            onClick={() => navigate("settings")}
          >
            <span className="profile-avatar" aria-hidden="true">{(profile.data?.username || user?.email || 'P').slice(0,1).toUpperCase()}</span><span className="profile-name">{profile.data?.username || user?.email}</span>
          </button>
          <Button
            variant="ghost"
            className="header-signout"
            aria-label={t("signOut")}
            disabled={signingOut}
            onClick={() => void logout()}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t("signOut")}</span>
          </Button>
        </div>
      </header>
      <nav className="app-nav hidden md:flex" aria-label={t("workspace")}>
        <WorkspaceLinks items={navigationGroups.flatMap(group => group.items)} active={store.activeTab} navigate={navigate}/>
      </nav>
      {navigationOpen && (
        <>
          <button
            className="mobile-nav-backdrop"
            aria-label={t("closeNavigation")}
            onClick={() => {
              setNavigationOpen(false);
            }}
          />
          <aside
            ref={navigationPanel}
            id="mobile-navigation"
            className="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("workspace")}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="brand">
                <img src="/prism.svg" alt="" width="30" height="30" />
                P.R.I.S.M.
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('closeNavigation')}
                onClick={() => {
                  setNavigationOpen(false);
                }}
              >
                <X size={20} />
              </Button>
            </div>
            <nav className="mobile-nav-links" aria-label={t("workspace")}>
              {groupedNavigation()}
            </nav>
          </aside>
        </>
      )}
      <main id="main-content" className="app-main" inert={navigationOpen}>
        {profile.data&&!report.error&&<AnalyticsBar report={report.data} period={period} label={label}/>}
        <div className="page-heading">
          <div>
            <p className="eyebrow mb-2">{store.activeTab === 'dashboard' ? (profile.isPending ? t('loading') : label) : t('personalWorkspace')}</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t(title)}
            </h1>
            <p className="page-description">{pageDescriptions[store.activeTab][store.locale === 'ms' ? 1 : 0]}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {profile.data && (store.activeTab === "dashboard" || store.activeTab === "analytics") && (
              <PeriodSelector selection={selection} period={period} onChange={setSelection}/>
            )}
            {(
              <Button data-quick-add onClick={add} disabled={pending || !!dataError}>
                <Plus size={16} />
                {t("addTransaction")}
              </Button>
            )}
          </div>
        </div>
        {!online && (
          <p className="warning-message mb-5" role="status">
            {t("offline")}
          </p>
        )}
        {rates.error && (
          <p className="warning-message mb-5" role="status">
            {t("ratesUnavailable")}
          </p>
        )}
        {dataError ? (
          <section className="card p-7" role="alert">
            <h2 className="font-semibold">{t("errorTitle")}</h2>
            <p className="my-3 text-sm">{errorMessage(dataError)}</p>
            <Button
              onClick={() =>
                void Promise.all([
                  transactions.refetch(),
                  categories.refetch(),
                  payments.refetch(),
                  profile.refetch(),
                  report.refetch(),
                ])
              }
            >
              {t("retry")}
            </Button>
          </section>
        ) : pending ? (
          <LoadingState />
        ) : (
          <Suspense fallback={<LoadingState />}>
            {typeof window !== 'undefined' && /(?:[?&])(?:item|note)=/.test(window.location.search) && <ActionSourceContext key={routeRevision} tab={store.activeTab}/>}
            {store.activeTab === "dashboard" && profile.data && (
              <Onboarding profile={profile.data} />
            )}
            {store.activeTab === "dashboard" && (
              <Dashboard
                {...data}
                report={report.data}
                period={period}
                periodLabel={label}
                onEdit={edit}
                onDelete={setDeleting}
                accountSummary={<><FinancialOverview /><PlanningHighlights /></>}
                onAdd={add}
              />
            )}
            {store.activeTab === "analytics" && <Analytics period={period} categories={data.categories}/>}
            {store.activeTab === "transactions" && (
              <div className="space-y-7">
                <Transactions key={routeRevision}
                  {...data}
                  onEdit={edit}
                  onDelete={setDeleting}
                />
                <AccountsSection />
              </div>
            )}
            {store.activeTab === "plans" && <Plans />}
            {store.activeTab === "accounting" && <Suspense fallback={<LoadingState />}><AccountingLab /></Suspense>}
            {store.activeTab === "accounts" && <AccountsPage />}
            {store.activeTab === 'notes' && <Suspense fallback={<LoadingState/>}><Notes/></Suspense>}
            {store.activeTab === 'reminders' && <Suspense fallback={<LoadingState/>}><Reminders/></Suspense>}
            {store.activeTab === 'notifications' && <Suspense fallback={<LoadingState/>}><Notifications/></Suspense>}
            {store.activeTab === 'calendar' && <Suspense fallback={<LoadingState/>}><Calendar key={routeRevision}/></Suspense>}
            {store.activeTab === "goals" && <ObjectivesPage key={routeRevision} kind="goal" />}
            {store.activeTab === "savings" && <ObjectivesPage key={routeRevision} kind="savings" />}
            {store.activeTab === "debts" && <DebtsPage key={routeRevision} />}
            {(store.activeTab === "categories" ||
              store.activeTab === "payments") && (
              <ManageLists
                key={store.activeTab}
                {...data}
                kind={store.activeTab}
                requireAuth={requireAuth}
              />
            )}
            {store.activeTab === "settings" && profile.data && (
              <SettingsView profile={profile.data} />
            )}
          </Suspense>
        )}
        {rates.data && (
          <p className="mt-8 text-xs text-subtle">
            {t("rateSource")}: {rates.data.source} ·{" "}
            {new Date(rates.data.updatedAt).toLocaleDateString(
              store.locale === "ms" ? "ms-MY" : "en-US",
            )}
          </p>
        )}
      </main>
      <BottomNavigation active={store.activeTab} navigate={navigate} add={add} canAdd={!pending&&!dataError&&online} more={openNavigation} expanded={navigationOpen} inert={navigationOpen||dialogOpen||!!deleting||paletteOpen}/>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onAdd={add} canAdd={!pending&&!dataError&&online}/>
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editing}
        categories={data.categories}
        payments={data.payments}
      />
      <Modal
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !mutations.remove.isPending) setDeleting(null);
        }}
        title={t("deleteTransaction")}
        description={t("deleteWarning")}
      >
        <p className="mb-3">{deleting?.description}</p>
        {deleting &&
          ((objectiveContributions.data ?? []).some(
            (c) => c.transaction_id === deleting.id,
          ) ||
            (debtRepayments.data ?? []).some(
              (r) => r.transaction_id === deleting.id,
            )) && (
            <p className="warning-message mb-5" role="alert">
              {t("linkedTransactionDelete")}
            </p>
          )}
        <div className="modal-actions">
          <Button
            variant="outline"
            disabled={mutations.remove.isPending}
            onClick={() => setDeleting(null)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={
              mutations.remove.isPending ||
              !online ||
              objectiveContributions.isPending ||
              debtRepayments.isPending
            }
            onClick={() => void remove()}
          >
            {t("delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

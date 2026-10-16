import { Bell, CalendarDays, ChartNoAxesCombined, FileText, HandCoins, Landmark, LayoutDashboard, MoreHorizontal, Plus, Settings, Target, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Tab } from '@/types';
import { Button } from '../ui/button';

const icons = { dashboard: LayoutDashboard, transactions: Wallet, accounts: Landmark, plans: Target, debts: HandCoins, analytics: ChartNoAxesCombined, accounting: Landmark, goals: Target, savings: Target, notes: FileText, reminders: Bell, notifications: Bell, calendar: CalendarDays, settings: Settings, categories: Wallet, payments: Wallet };
export const navigationGroups: { en: string; ms: string; items: Tab[] }[] = [
  { en: 'Your money', ms: 'Wang anda', items: ['dashboard', 'transactions', 'accounts', 'plans', 'debts'] },
  { en: 'Understand & act', ms: 'Fahami dan bertindak', items: ['analytics', 'calendar', 'reminders', 'notes', 'notifications'] },
  { en: 'Goals & savings', ms: 'Matlamat dan simpanan', items: ['goals', 'savings'] },
  { en: 'Personal & advanced', ms: 'Peribadi dan lanjutan', items: ['settings', 'categories', 'payments', 'accounting'] },
];

export function WorkspaceLinks({ items, active, navigate, compactLabels = false }: { items: readonly Tab[]; active: Tab; navigate: (tab: Tab) => void; compactLabels?: boolean }) {
  const { t, i18n } = useTranslation();
  return items.map(id => {
    const Icon = icons[id];
    return <a href={`/${id}`} key={id} title={t(id)} aria-label={t(id)} aria-current={active === id ? 'page' : undefined} onClick={event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); navigate(id);
    }}><Icon size={18} aria-hidden="true" /><span>{compactLabels && id === 'dashboard' ? (i18n.language === 'ms' ? 'Utama' : 'Home') : compactLabels && id === 'plans' ? (i18n.language === 'ms' ? 'Pelan' : 'Plans') : t(id)}</span></a>;
  });
}

export function BottomNavigation({ active, navigate, add, canAdd, more, expanded, inert }: { active: Tab; navigate: (tab: Tab) => void; add: () => void; canAdd: boolean; more: (opener: HTMLButtonElement) => void; expanded: boolean; inert: boolean }) {
  const { t, i18n } = useTranslation();
  const plansActive = active === 'goals' || active === 'savings' ? 'plans' : active;
  return <nav className="mobile-bottom-nav" aria-label={i18n.language === 'ms' ? 'Navigasi utama' : 'Primary navigation'} inert={inert}>
    <WorkspaceLinks items={['dashboard', 'transactions']} active={plansActive} navigate={navigate} compactLabels />
    <Button className="bottom-add" size="icon" aria-label={t('quickAdd')} data-quick-add onClick={add} disabled={!canAdd}><Plus size={23} aria-hidden="true" /></Button>
    <WorkspaceLinks items={['plans']} active={plansActive} navigate={navigate} compactLabels />
    <button type="button" aria-expanded={expanded} aria-controls="mobile-navigation" onClick={event => more(event.currentTarget)}><MoreHorizontal size={21} aria-hidden="true" /><span>{i18n.language === 'ms' ? 'Lagi' : 'More'}</span></button>
  </nav>;
}

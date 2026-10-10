import { dashboardFinancials, type FinancialReport } from '@/domain/dashboard';
import { formatCurrency } from '@/services/currency';
import { useAppStore } from '@/store/useAppStore';
import type { Category, PaymentMethod, Transaction } from '@/types';
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, ChevronRight, TrendingUp } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CashFlowChart } from './analytics/CashFlowChart';
import { SpendingDonut } from './analytics/SpendingDonut';
import { FinancialPulse } from './analytics/FinancialPulse';
import { drillTransactions } from '@/lib/navigation';
import { ratio } from '@/domain/analytics';
import { resolveFinancialPeriod, type Period } from '@/domain/periods';
import { financialDate } from '@/domain/dates';
import { useFinancialCopy } from './financial/shared';
import { TransactionTable } from './TransactionTable';

export interface DashboardProps { transactions: Transaction[]; categories: Category[]; payments: PaymentMethod[]; month?: string; period?: Period; periodLabel?: string; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void; accountSummary?: ReactNode; report?: FinancialReport; onAdd?: () => void }
export function Dashboard({ transactions, categories, payments, month, period: selectedPeriod, periodLabel, onEdit, onDelete, accountSummary, report, onAdd }: DashboardProps) {
  const { t } = useTranslation();
  const c = useFinancialCopy();
  const { currency, locale, exchangeRates, setActiveTab, financialTimezone, personalization } = useAppStore();
  const period = selectedPeriod ?? resolveFinancialPeriod({type:'month',month:month ?? financialDate(new Date(),financialTimezone).slice(0,7)},financialTimezone);
  const data = useMemo(() => dashboardFinancials(transactions, categories, period, currency, exchangeRates, financialTimezone, locale, t('uncategorized'), report), [transactions, categories, period, currency, exchangeRates, financialTimezone, locale, t, report]);
  const money = (value: number | string) => data.unavailable ? '—' : `${data.mixed ? '≈ ' : ''}${formatCurrency(value, currency, locale)}`;
  const drill = (id?: string|null) => drillTransactions({type:'expense',category:id===null?'uncategorized':id,from:period.from,to:period.to,activity:'ordinary'});
  const modules: Record<string, ReactNode> = {
    pulse: <FinancialPulse period={period}/>,
    cashFlow: <CashFlowChart points={data.unavailable?[]:data.chart}/>,
    spending: data.unavailable ? <section className="card p-6" aria-label={t('spending')}><h3>{t('spending')}</h3><p className="text-sm text-subtle mt-3" role="status">{t('ratesUnavailable')}</p><button className="text-link mt-4" onClick={()=>drill()}>{t('transactions')}<ChevronRight size={14}/></button></section> : <SpendingDonut key={`${period.from}-${period.to}`} total={data.expenseExact} items={data.breakdown.map(item=>({...item,percent:ratio(item.exact,data.expenseExact,currency) ?? 0}))} onDrill={drill}/>,
    position: accountSummary,
    recent: <section className="card min-w-0 overflow-hidden"><div className="card-heading"><div><h3>{t('recentTransactions')}</h3><p>{t('latestActivity')}</p></div><button className="text-link" onClick={() => setActiveTab('transactions')}>{t('viewAll')}<ChevronRight size={14}/></button></div><TransactionTable transactions={transactions.slice(0,5)} categories={categories} payments={payments} onEdit={onEdit} onDelete={onDelete} compact/></section>,
  };
  const metrics = [
    { label: t('analyticsPeriodIncome'), value: money(data.incomeExact), detail: periodLabel ?? t('period'), icon: ArrowDownLeft },
    { label: t('analyticsPeriodExpenses'), value: money(data.expenseExact), detail: periodLabel ?? t('period'), icon: ArrowUpRight },
    { label: t('savingsRate'), value: personalization.privacyMode ? '•••' : data.unavailable ? '—' : data.income ? `${data.savingsRate.toFixed(1)}%` : '—', detail: data.income ? c('Income less spending; not actual savings', 'Pendapatan tolak belanja; bukan simpanan sebenar') : t('noIncome'), icon: TrendingUp },
  ];
  return <div className="space-y-6">
    {data.unavailable && <p role="status" className="warning-message">{t('ratesUnavailable')}</p>}
    <div>
      <section className="snapshot" aria-label={t('periodSnapshot')}>
        <div className="snapshot-main">
          <h2 className="snapshot-label"><ChartNoAxesCombined size={17} />{t('periodCashFlow')}</h2>
          <p className="snapshot-value">{data.unavailable ? '—' : `${data.positiveFlow ? '' : '−'}${money(data.netMagnitude)}`}</p>
          <p className="snapshot-note">{data.unavailable ? t('ratesUnavailable') : data.income || data.expense ? t(data.positiveFlow ? 'positivePeriodFlow' : 'negativePeriodFlow') : t('emptyPeriodFlow')}</p>
        </div>
        <div className="snapshot-metrics">{metrics.map(({ label, value, detail, icon: Icon }) => <div className={`snapshot-metric ${label===t('analyticsPeriodIncome')?'income':label===t('analyticsPeriodExpenses')?'expense':''}`} key={label}><span><Icon size={15} />{label}</span><strong>{value}</strong><small>{detail}</small></div>)}</div>
      </section>
      <div className="flow-note"><span title={t('balanceNote')}>{t('totalBalance')}: <strong>{money(data.balanceExact)}</strong> · {t('allTime')}</span><span>{c('Account balances shown separately below.', 'Baki akaun dipaparkan berasingan di bawah.')}</span></div>
      {data.mixed && !data.unavailable && <p className="mt-2 text-xs text-subtle">≈ {c('Converted totals are estimates in', 'Jumlah ditukar ialah anggaran dalam')} {currency}. {c('Rate date:', 'Tarikh kadar:')} {exchangeRates ? new Date(exchangeRates.updatedAt).toLocaleDateString(locale === 'ms' ? 'ms-MY' : 'en-US') : c('unavailable', 'tidak tersedia')}.</p>}
    </div>
    {!transactions.length && <button className="text-link" onClick={onAdd}>{t('addFirst')}<ChevronRight size={14}/></button>}
    <div className="dashboard-modules">{personalization.dashboardOrder.filter(module=>!personalization.hiddenModules.includes(module)).map(module=><div key={module} className={'dashboard-module module-'+module}>{modules[module]}</div>)}</div>
  </div>;
}

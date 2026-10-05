import { financialDate } from '@/domain/dates';
import { accountBalance, debtProgress, objectiveProgress } from '@/domain/progress';
import { useTransactions } from '@/hooks/useFinanceData';
import { usePlatformTable } from '@/hooks/usePlatformData';
import { useAppStore } from '@/store/useAppStore';
import { Target, HandCoins, ChevronRight } from 'lucide-react';
import { Failure, money, ProgressBar, useFinancialCopy } from './shared';

export function FinancialOverview() {
  const c = useFinancialCopy();
  const timezone = useAppStore(s => s.financialTimezone);
  const accounts = usePlatformTable('accounts');
  const objectives = usePlatformTable('objectives');
  const contributions = usePlatformTable('objective_contributions');
  const debts = usePlatformTable('person_debts');
  const repayments = usePlatformTable('debt_repayments');
  const transactions = useTransactions();
  const { setActiveTab,personalization } = useAppStore();
  const queries = [accounts, objectives, contributions, debts, repayments, transactions];
  if (queries.some(q => q.isPending)) return <p className="text-sm text-subtle" role="status">{c('Loading financial progress…', 'Memuatkan kemajuan kewangan…')}</p>;
  const error = queries.find(q => q.error);
  if (error) return <Failure error={error.error} retry={() => void Promise.all(queries.map(q => q.refetch()))} />;
  const tx = transactions.data ?? [];
  const activeAccounts = (accounts.data ?? []).filter(a => !a.archived);
  const activeGoals = (objectives.data ?? []).filter(o => o.status !== 'archived' && !objectiveProgress(o, contributions.data ?? [], tx).completed);
  const activeDebts = (debts.data ?? []).filter(d => !debtProgress(d, repayments.data ?? [], tx, timezone).settled);
  const owe = activeDebts.filter(d => d.direction === 'i_owe').sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
  const receivables = activeDebts.filter(d => d.direction === 'owed_to_me');
  const next = owe.find(d => debtProgress(d, repayments.data ?? [], tx, timezone).overdue) ?? owe[0];
  const recent = [...(contributions.data ?? []).map(item => ({ id: item.id, date: item.contributed_at, label: (objectives.data ?? []).find(o => o.id === item.objective_id)?.name ?? c('Goal', 'Matlamat'), amount: item.effective_amount ?? item.amount ?? '0', currency: item.currency, kind: c('Contribution', 'Sumbangan') })), ...(repayments.data ?? []).map(item => ({ id: item.id, date: item.paid_at, label: (debts.data ?? []).find(d => d.id === item.debt_id)?.counterparty ?? c('Debt', 'Hutang'), amount: item.effective_amount ?? item.amount ?? '0', currency: item.currency, kind: c('Repayment', 'Bayaran balik') }))].sort((a,b) => b.date.localeCompare(a.date)).slice(0,3);
  return <section className="space-y-5" aria-label={c('Financial summary', 'Ringkasan kewangan')}>
    <div className="position-grid">
      {personalization.showAccounts && <div className="position-section"><div className="position-heading"><h3>{c('Your accounts', 'Akaun anda')}</h3><button className="text-link" onClick={() => setActiveTab('accounts')}>{c('Manage', 'Urus')}<ChevronRight size={14} /></button></div>{activeAccounts.length ? <ul>{activeAccounts.slice(0,3).map(a => <li key={a.id} className="position-row"><div className="row-title"><span>{a.name}</span><strong>{money(accountBalance(a, tx), a.currency)}</strong></div><small>{a.currency}</small></li>)}</ul> : <p className="position-empty">{c('Add your first account to track available balances.', 'Tambah akaun pertama untuk menjejak baki tersedia.')}</p>}<p className="text-xs text-subtle">{activeAccounts.length} {c('active accounts', 'akaun aktif')}</p></div>}
      {personalization.showGoals && <div className="position-section"><div className="position-heading"><h3 className="flex items-center gap-2 text-savings"><Target size={16}/>{c('Goals & savings', 'Matlamat dan simpanan')}</h3><button className="text-link" onClick={() => setActiveTab('plans')}>{c('View plans', 'Lihat pelan')}<ChevronRight size={14} /></button></div>{activeGoals.length ? <ul>{activeGoals.slice(0,2).map(o => { const p = objectiveProgress(o, contributions.data ?? [], tx); return <li key={o.id} className="position-row"><div className="row-title"><span>{o.name}</span><strong>{personalization.privacyMode?'•••':`${p.percent.toFixed(0)}%`}</strong></div><ProgressBar value={p.percent} /><small>{money(p.funded, o.currency)} {c('of', 'daripada')} {money(o.target_amount, o.currency)}</small></li>; })}</ul> : <p className="position-empty">{c('Set a target for something that matters to you.', 'Tetapkan sasaran untuk perkara yang penting kepada anda.')}</p>}</div>}
      {personalization.showDebts && <div className="position-section"><div className="position-heading"><h3 className="flex items-center gap-2 text-debt"><HandCoins size={16}/>{c('Your commitments', 'Komitmen anda')}</h3><button className="text-link" onClick={() => setActiveTab('debts')}>{c('View debts', 'Lihat hutang')}<ChevronRight size={14} /></button></div>{next ? <button className={debtProgress(next, repayments.data ?? [], tx, timezone).overdue ? 'attention-row w-full text-left' : 'position-row block w-full text-left'} onClick={() => setActiveTab('debts')}><span className="block text-xs text-subtle">{c('Owed to', 'Terhutang kepada')} {next.counterparty}</span><strong className="my-1 block text-xl">{money(debtProgress(next, repayments.data ?? [], tx, timezone).remaining, next.currency)}</strong>{next.due_date && <small>{c('Due', 'Tarikh akhir')} {next.due_date}{debtProgress(next, repayments.data ?? [], tx, timezone).overdue ? c(' · Overdue', ' · Tertunggak') : ''}</small>}</button> : <p className="position-empty">{c('No active debts to repay.', 'Tiada hutang aktif untuk dibayar.')}</p>}<p className="mt-3 text-xs text-subtle">{receivables.length} {c('active receivables. Separate from available cash.', 'hutang aktif kepada anda. Berasingan daripada tunai tersedia.')}</p></div>}
    </div>
    {recent.length > 0 && <div className="border-t border-border pt-4"><h3 className="text-xs font-medium text-subtle">{c('Recent progress', 'Kemajuan terkini')}</h3><ul className="mt-3 grid gap-3 sm:grid-cols-3">{recent.map(item => <li key={item.id} className="text-xs"><strong>{item.kind}: {money(item.amount, item.currency)}</strong><span className="mt-1 block text-subtle">{item.label} · {financialDate(item.date, timezone)}</span></li>)}</ul></div>}
  </section>;
}

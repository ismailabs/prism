import { financialDate } from '@/domain/dates';
import { useTransactionPage } from '@/hooks/useFinancialReports';
import { usePlatformTable } from '@/hooks/usePlatformData';
import { useAppStore } from '@/store/useAppStore';
import type { Category, PaymentMethod, Transaction } from '@/types';
import { Download, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CsvImport } from './financial/CsvImport';
import { Failure } from './financial/shared';
import { TransactionTable } from './TransactionTable';
import { Button } from './ui/button';

export interface TransactionsProps { transactions: Transaction[]; categories: Category[]; payments: PaymentMethod[]; search: string; setSearch: (value: string) => void; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void }
export function Transactions({ categories, payments, search: rememberedSearch, setSearch: rememberSearch, onEdit, onDelete }: TransactionsProps) {
  const { t } = useTranslation();
  const [initial] = useState(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search));
  const [search, setLocalSearch] = useState(initial.get('search') ?? rememberedSearch);
  const setSearch = (value: string) => { setLocalSearch(value); rememberSearch(value); };
  const drill = initial.get('activity') === 'ordinary';
  const [filtersOpen, setFiltersOpen] = useState(initial.size > 0);
  const [type, setType] = useState(initial.get('type') ?? '');
  const [category, setCategory] = useState(initial.get('category') ?? '');
  const [payment, setPayment] = useState(initial.get('payment') ?? '');
  const [from, setFrom] = useState(initial.get('from') ?? '');
  const [to, setTo] = useState(initial.get('to') ?? '');
  const [account, setAccount] = useState(initial.get('account') ?? '');
  const [currency, setCurrency] = useState(initial.get('currency') ?? '');
  const [min, setMin] = useState(initial.get('min') ?? '');
  const [max, setMax] = useState(initial.get('max') ?? '');
  const [page, setPage] = useState(1);
  const accounts = usePlatformTable('accounts');
  const result = useTransactionPage({ search, type, category, payment, from, to, account, currency, min, max, activity: drill ? 'ordinary' : undefined }, page);
  const rows = result.data?.rows ?? [];
  const pages = Math.max(1, Math.ceil((result.data?.total ?? 0) / 15));
  const currentPage = Math.min(page, pages);
  if (result.data && page > pages) setPage(pages);
  useEffect(() => {
    // Keep valid contextual deep links (for example ?item=transaction-id).
    const query = new URLSearchParams(initial);
    for (const [key, value] of Object.entries({ search, type, category, payment, from, to, account, currency, min, max, activity: drill ? 'ordinary' : '' })) {
      query.delete(key); if (value) query.set(key, value);
    }
    window.history.replaceState(null, '', `/transactions${query.size ? `?${query}` : ''}`);
  }, [initial, search, type, category, payment, from, to, account, currency, min, max, drill]);
  const chips = [
    { label: t('type'), value: type ? t(type) : '', clear: () => setType('') },
    { label: t('category'), value: category ? categories.find(c => c.id === category)?.name ?? t('uncategorized') : '', clear: () => setCategory('') },
    { label: t('paymentMethod'), value: payment ? payments.find(p => p.id === payment)?.name ?? payment : '', clear: () => setPayment('') },
    { label: t('accounts'), value: account ? accounts.data?.find(a => a.id === account)?.name ?? account : '', clear: () => setAccount('') },
    { label: t('currency'), value: currency, clear: () => { setCurrency(''); setMin(''); setMax(''); } },
    { label: t('from'), value: from, clear: () => setFrom('') },
    { label: t('to'), value: to, clear: () => setTo('') },
    { label: t('minimumAmount'), value: min, clear: () => setMin('') },
    { label: t('maximumAmount'), value: max, clear: () => setMax('') },
  ].filter(chip => chip.value);
  function clear() { setType(''); setCategory(''); setPayment(''); setFrom(''); setTo(''); setAccount(''); setCurrency(''); setMin(''); setMax(''); setPage(1); }
  function exportCsv() {
    if (!rows.length) { toast.info(t('exportEmpty')); return; }
    const escape = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
    const values = [['Date', 'Description', 'Type', 'Amount', 'Currency', 'Category', 'Payment method'], ...rows.map(tx => [tx.transaction_date, tx.description, tx.type, String(tx.amount), tx.currency, categories.find(c => c.id === tx.category_id)?.name ?? '', payments.find(p => p.id === tx.payment_method_id)?.name ?? ''])];
    const blob = new Blob(['\uFEFF' + values.map(row => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `prism-transactions-${financialDate(new Date(), useAppStore.getState().financialTimezone)}.csv`; link.click(); URL.revokeObjectURL(url);
    toast.success(t('exportSuccess'));
  }
  const change = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  return <>
    {drill && <div className="drilldown-banner"><span>{t('drilldown')} · {t('ordinaryActivity')}</span><button className="text-link" onClick={() => { window.history.pushState(null, '', '/transactions'); window.dispatchEvent(new PopStateEvent('popstate')); }}>{t('clearDrilldown')}</button></div>}
    <section className="card overflow-hidden transaction-workspace" aria-busy={result.isPending}>
      <div className="transaction-toolbar">
        <h2>{t('allTransactions')} <span className="record-count" aria-live="polite">{result.data?.total ?? '—'}</span></h2>
        <div className="flex flex-wrap gap-2"><CsvImport categories={categories} payments={payments} /><Button variant="outline" size="sm" disabled={result.isPending || !!result.error} onClick={exportCsv}><Download size={15} />{t('exportPage')}</Button></div>
      </div>
      <div className="transaction-search">
        <div className="search-field"><Search size={17} /><input value={search} onChange={e => change(setSearch, e.target.value)} placeholder={t('search')} aria-label={t('search')} />{search && <button type="button" onClick={() => change(setSearch, '')} aria-label={t('clearFilters')}><X size={18} /></button>}</div>
        <Button variant="outline" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="transaction-filters"><SlidersHorizontal size={16} />{t('filter')}{chips.length > 0 && <span className="record-count">{chips.length}</span>}</Button>
      </div>
      {chips.length > 0 && <div className="filter-chips" aria-label={t('filter')}>{chips.map(chip => <button type="button" key={chip.label} onClick={() => { chip.clear(); setPage(1); }} aria-label={`${t('clearFilters')}: ${chip.label} ${chip.value}`}><span>{chip.label}: {chip.value}</span><X size={14} /></button>)}<button type="button" className="filter-reset" onClick={clear}>{t('clearFilters')}</button></div>}
      {filtersOpen && <div id="transaction-filters" className="transaction-filters">
        <label className="form-field">{t('type')}<select className="input" aria-label={t('type')} value={type} onChange={e => change(setType, e.target.value)}><option value="">{t('allTypes')}</option><option value="income">{t('income')}</option><option value="expense">{t('expenses')}</option></select></label>
        <label className="form-field">{t('category')}<select className="input" aria-label={t('category')} value={category} onChange={e => change(setCategory, e.target.value)}><option value="">{t('allCategories')}</option><option value="uncategorized">{t('uncategorized')}</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="form-field">{t('paymentMethod')}<select className="input" aria-label={t('paymentMethod')} value={payment} onChange={e => change(setPayment, e.target.value)}><option value="">{t('allPayments')}</option>{payments.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="form-field">{t('from')}<input className="input" type="date" max={to || undefined} value={from} onChange={e => change(setFrom, e.target.value)} /></label>
        <label className="form-field">{t('to')}<input className="input" type="date" min={from || undefined} value={to} onChange={e => change(setTo, e.target.value)} /></label>
        <label className="form-field">{t('accounts')}<select className="input" aria-label={t('accounts')} value={account} onChange={e => change(setAccount, e.target.value)}><option value="">{t('allAccounts')}</option>{accounts.data?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="form-field">{t('currency')}<select className="input" aria-label={t('currency')} value={currency} onChange={e => { change(setCurrency, e.target.value); setMin(''); setMax(''); }}><option value="">{t('allCurrencies')}</option>{['MYR', 'USD', 'EUR', 'JPY'].map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="form-field">{t('minimumAmount')}<input className="input" disabled={!currency} inputMode="decimal" value={min} onChange={e => change(setMin, e.target.value)} /></label>
        <label className="form-field">{t('maximumAmount')}<input className="input" disabled={!currency} inputMode="decimal" value={max} onChange={e => change(setMax, e.target.value)} /></label>
      </div>}
      {result.isPending ? <div className="transaction-loading" role="status">{t('loading')}<div className="skeleton h-16" /><div className="skeleton h-16" /><div className="skeleton h-16" /></div> : result.error ? <Failure error={result.error} retry={() => void result.refetch()} /> : <TransactionTable emptyKind={!search && !chips.length && !drill ? 'unrecorded' : 'filtered'} transactions={rows} categories={categories} payments={payments} onEdit={onEdit} onDelete={onDelete} />}
      <div className="transaction-pagination"><span>{t('page')} {currentPage} / {pages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={result.isPending || !!result.error || currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{t('previous')}</Button><Button size="sm" variant="outline" disabled={result.isPending || !!result.error || currentPage >= pages} onClick={() => setPage(currentPage + 1)}>{t('next')}</Button></div></div>
    </section>
  </>;
}

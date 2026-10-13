import { lazy, Suspense, useMemo, useState } from 'react';
import { accountingReport } from '@/domain/accounting';
import { financialDate } from '@/domain/dates';
import { useHostedLedger, type HostedLedgerLine, type HostedAllocation } from '@/hooks/useHostedLedger';
import { useAppStore } from '@/store/useAppStore';
import type { Currency } from '@/types';
import { Button } from '../ui/button';
import { Failure, money, useFinancialCopy } from './shared';

const SyntheticLedgerReview = lazy(() => import('./SyntheticLedgerReview'));
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export default function AccountingLab() {
  const c = useFinancialCopy(), zone = useAppStore(s => s.financialTimezone), privacy = useAppStore(s => s.personalization.privacyMode);
  const today = financialDate(new Date(), zone);
  const [demo, setDemo] = useState(false), [currency, setCurrency] = useState<Currency>('MYR');
  const [start, setStart] = useState(today.slice(0, 7) + '-01'), [end, setEnd] = useState(today);
  const ledger = useHostedLedger(!demo);
  const valid = validDate(start) && validDate(end) && start <= end && end <= today;
  const report = useMemo(() => valid && ledger.data ? accountingReport(ledger.data.accounts, ledger.data.lines, currency, start, end) : null, [ledger.data, valid, currency, start, end]);
  const amount = (value: string) => privacy ? '••••' : money(value, currency);
  const accountMap = useMemo(() => new Map(ledger.data?.accounts.map(a => [a.id, a.code])), [ledger.data]);
  const eventDetails = useMemo(() => {
    const lines = new Map<string, HostedLedgerLine[]>();
    const allocations = new Map<string, HostedAllocation[]>();
    for (const line of ledger.data?.lines ?? []) {
      const group = lines.get(line.event_id) ?? []; group.push(line); lines.set(line.event_id, group);
    }
    for (const group of lines.values()) group.sort((a, b) => a.ordinal - b.ordinal);
    for (const allocation of ledger.data?.allocations ?? []) {
      const group = allocations.get(allocation.event_id) ?? []; group.push(allocation); allocations.set(allocation.event_id, group);
    }
    return { lines, allocations };
  }, [ledger.data]);
  const classes = { asset: c('Asset', 'Aset'), liability: c('Liability', 'Liabiliti'), equity: c('Equity', 'Ekuiti'), income: c('Income', 'Pendapatan'), expense: c('Expense', 'Perbelanjaan') };
  const kinds = { opening:c('Opening','Pembukaan'), income:c('Income','Pendapatan'), salary:c('Salary','Gaji'), expense:c('Expense','Perbelanjaan'), split_expense:c('Split expense','Perbelanjaan berpecah'), transfer:c('Transfer','Pindahan'), loan_payment:c('Loan payment','Bayaran pinjaman'), card_settlement:c('Card settlement','Penyelesaian kad'), goal_earmark:c('Goal earmark','Peruntukan matlamat'), goal_transfer:c('Goal transfer','Pindahan matlamat'), refund:c('Refund','Bayaran balik'), reversal:c('Reversal','Pembalikan'), adjustment:c('Adjustment','Pelarasan') };
  return <div className="space-y-5">
    <nav aria-label={c('Ledger views', 'Paparan lejar')} className="flex flex-wrap gap-2">
      <Button variant={demo ? 'outline' : 'default'} aria-pressed={!demo} onClick={() => setDemo(false)}>{c('My shadow ledger', 'Lejar bayangan saya')}</Button>
      <Button variant={demo ? 'default' : 'outline'} aria-pressed={demo} onClick={() => setDemo(true)}>{c('Synthetic example', 'Contoh rekaan')}</Button>
    </nav>
    {demo ? <Suspense fallback={<p role="status">{c('Loading example…', 'Memuatkan contoh…')}</p>}><SyntheticLedgerReview /></Suspense> : <section className="card p-5 space-y-5" aria-label={c('My shadow ledger', 'Lejar bayangan saya')}>
      <header><h2 className="text-xl font-semibold">{c('My shadow ledger', 'Lejar bayangan saya')}</h2><p>{c('Your posted shadow ledger entries only. Recorded account balances remain authoritative. No automatic backfill or money movement occurs here.', 'Catatan lejar bayangan anda sahaja. Baki akaun yang direkod kekal berkuasa. Tiada pengisian sejarah atau aliran wang automatik di sini.')}</p></header>
      <Button variant="outline" disabled={ledger.isFetching} onClick={() => void ledger.refetch()}>{c('Refresh ledger', 'Muat semula lejar')}</Button>
      {ledger.isError ? <Failure error={ledger.error} retry={() => void ledger.refetch()} /> : ledger.isPending ? <p role="status">{c('Loading private ledger…', 'Memuatkan lejar peribadi…')}</p> : <>
        <div className="flex flex-wrap gap-4">
          <label className="form-field">{c('Native currency', 'Mata wang asal')}<select className="input" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>{(['MYR','USD','EUR','JPY'] as const).map(code => <option key={code}>{code}</option>)}</select></label>
          <label className="form-field">{c('Period starts', 'Tempoh bermula')}<input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
          <label className="form-field">{c('Through', 'Sehingga')}<input className="input" type="date" max={today} value={end} onChange={e => setEnd(e.target.value)} /></label>
        </div>
        {!valid ? <p role="alert">{c('Choose a valid period through today.', 'Pilih tempoh sah sehingga hari ini.')}</p> : !ledger.data?.events.some(e => e.currency === currency && e.financial_date <= end) ? <p>{c('No posted shadow entries in this currency. This does not establish zero assets or a reconciled balance sheet. Your financial accounts and transactions remain available in their own pages.', 'Tiada catatan bayangan dalam mata wang ini. Ini tidak membuktikan aset sifar atau kunci kira-kira yang direkonsiliasi. Akaun dan transaksi kewangan anda kekal tersedia di halaman masing-masing.')}</p> : report && <>
          <p role="status">{currency} · {start} → {end} · {c('Exact equation difference', 'Perbezaan persamaan tepat')}: {amount(report.equationDifference)}</p>
          <p className="text-sm text-subtle">{c('These statements cover posted shadow entries, not your complete financial position. Native currencies are separate.', 'Penyata ini merangkumi catatan bayangan, bukan keseluruhan kedudukan kewangan anda. Mata wang asal diasingkan.')}</p>
          <div className="grid gap-4 md:grid-cols-2">{[
            { title:c('Shadow balance sheet','Kunci kira-kira bayangan'), rows:[[c('Assets','Aset'),report.assets],[c('Liabilities','Liabiliti'),report.liabilities],[c('Equity including retained earnings','Ekuiti termasuk pendapatan tertahan'),report.equity],[c('Shadow net worth','Nilai bersih bayangan'),report.netWorth]] },
            { title:c('Shadow income statement','Penyata pendapatan bayangan'), rows:[[c('Income','Pendapatan'),report.income],[c('Expenses','Perbelanjaan'),report.expenses],[c('Period surplus','Lebihan tempoh'),report.profit]] },
          ].map(section => <section key={section.title} aria-label={section.title} className="rounded-xl border border-border p-4"><h3 className="font-semibold">{section.title}</h3><dl>{section.rows.map(([label,value]) => <div key={label} className="flex justify-between gap-4 py-2"><dt>{label}</dt><dd className="tabular-nums whitespace-nowrap">{amount(value)}</dd></div>)}</dl></section>)}</div>
          <section aria-label={c('Ledger accounts','Akaun lejar')}><h3 className="font-semibold">{c('Ledger accounts','Akaun lejar')}</h3><div role="region" tabIndex={0} aria-label={c('Scroll ledger accounts','Tatal akaun lejar')} className="overflow-x-auto"><table className="min-w-[34rem] w-full text-left text-sm"><thead><tr><th className="p-2">{c('Account','Akaun')}</th><th className="p-2">{c('Classification','Klasifikasi')}</th><th className="p-2">{c('Signed balance','Baki bertanda')}</th></tr></thead><tbody>{ledger.data.accounts.filter(a => a.currency === currency).map(a => <tr key={a.id}><td className="break-words p-2">{a.code}</td><td className="p-2">{classes[a.classification]}</td><td className="p-2 tabular-nums whitespace-nowrap">{amount(report.balances[a.id])}</td></tr>)}</tbody></table></div></section>
          <section aria-label={c('Journal detail','Butiran jurnal')}><h3 className="font-semibold">{c('Journal detail','Butiran jurnal')}</h3>{ledger.data.events.filter(e => e.currency === currency && e.financial_date <= end).map(e => <details key={e.id} className="border-b border-border py-3"><summary className="cursor-pointer break-words">{e.financial_date} · {kinds[e.kind]} · {e.request_key} · {e.financial_timezone}</summary><div role="region" tabIndex={0} aria-label={`${c('Scroll journal','Tatal jurnal')} ${e.request_key}`} className="overflow-x-auto"><table className="min-w-[34rem] w-full text-left text-sm"><thead><tr><th className="p-2">{c('Account','Akaun')}</th><th className="p-2">{c('Debit','Debit')}</th><th className="p-2">{c('Credit','Kredit')}</th></tr></thead><tbody>{(eventDetails.lines.get(e.id) ?? []).map(line => <tr key={line.id}><td className="p-2 break-words">{accountMap.get(line.account_id)}</td><td className="p-2 tabular-nums whitespace-nowrap">{line.side === 'debit' ? amount(line.amount) : '—'}</td><td className="p-2 tabular-nums whitespace-nowrap">{line.side === 'credit' ? amount(line.amount) : '—'}</td></tr>)}</tbody></table></div>{(eventDetails.allocations.get(e.id) ?? []).map(a => <p key={a.id}>{c('Goal allocation; no additional cash movement','Peruntukan matlamat; tiada aliran tunai tambahan')}: {amount(a.amount)}</p>)}</details>)}</section>
        </>}
      </>}
    </section>}
  </div>;
}

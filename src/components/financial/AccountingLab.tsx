import { useState } from 'react';
import type { Currency } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { accountingReport } from '@/domain/accounting';
import { financialDate, materializeFixture, reconcileHistory, translateHistory } from '@/domain/ledger-reconciliation';
import type { HistoricalFixture } from '@/domain/ledger-reconciliation';
import source from '../../../supabase/tests/ledger-history.synthetic.json';
import { money } from './shared';

// Reuse the accepted synthetic viewer. No provider reads or posting controls.
const fixture = source as HistoricalFixture;
const translation = translateHistory(fixture);
const materialized = materializeFixture(translation, fixture.timezone);
const reconciliation = reconcileHistory(fixture);
const through = financialDate(fixture.cutoff, fixture.timezone);
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export default function AccountingLab() {
  const locale = useAppStore(s => s.locale);
  const w = (en: string, ms: string) => locale === 'ms' ? ms : en;
  const [currency, setCurrency] = useState<Currency>('MYR');
  const [start, setStart] = useState('2000-02-01');
  const [end, setEnd] = useState(through);
  const valid = validDate(start) && validDate(end) && start <= end && end <= through;
  const report = valid ? accountingReport(translation.accounts, materialized.lines, currency, start, end) : null;
  const accounts = translation.accounts.filter(a => a.currency === currency);
  const events = materialized.events.filter(e => e.currency === currency && e.financial_date <= end);
  const classes = { asset: w('Asset', 'Aset'), liability: w('Liability', 'Liabiliti'), equity: w('Equity', 'Ekuiti'), income: w('Income', 'Pendapatan'), expense: w('Expense', 'Perbelanjaan') };
  const kinds: Record<string, string> = {
    opening: w('Opening', 'Pembukaan'), income: w('Income', 'Pendapatan'), salary: w('Salary', 'Gaji'), expense: w('Expense', 'Perbelanjaan'), split_expense: w('Split expense', 'Perbelanjaan berpecah'), transfer: w('Transfer', 'Pindahan'), loan_payment: w('Loan payment', 'Bayaran pinjaman'), card_settlement: w('Card settlement', 'Penyelesaian kad'), goal_earmark: w('Goal earmark', 'Peruntukan matlamat'), goal_transfer: w('Goal transfer', 'Pindahan matlamat'), refund: w('Refund', 'Bayaran balik'), reversal: w('Reversal', 'Pembalikan'), adjustment: w('Adjustment', 'Pelarasan'),
  };
  return <div className="card p-5 space-y-6">
    <header><p className="eyebrow">P.R.I.S.M. / PHASE 02</p><h2 className="text-xl font-semibold">{w('Synthetic ledger review', 'Semakan lejar rekaan')}</h2></header>
    <p className="rounded-xl border border-border bg-muted p-4">{w('Synthetic fixtures only. Local shadow ledger; your recorded balances remain authoritative. Native currencies are separate; FX is unsupported.', 'Data rekaan sahaja. Lejar bayangan setempat; baki anda yang direkod kekal berkuasa. Mata wang asal diasingkan; pertukaran mata wang tidak disokong.')}</p>
    <p className="text-sm text-muted-foreground">{w('Fixture cutoff', 'Had masa data rekaan')}: {fixture.cutoff} · {fixture.timezone}. {w('Deferred events', 'Catatan tertunda')}: {translation.deferred.length}. {w('Reconciliation differences', 'Perbezaan rekonsiliasi')}: {reconciliation.comparisons.filter(c => !/^0(?:\.0+)?$/.test(c.difference)).length}.</p>
    <div className="flex flex-wrap gap-4">
      <label className="grid gap-1 text-sm">{w('Native currency', 'Mata wang asal')}<select className="rounded border border-border bg-background p-2" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>{(['MYR', 'USD', 'EUR', 'JPY'] as const).map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="grid gap-1 text-sm">{w('Period starts', 'Tempoh bermula')}<input className="rounded border border-border bg-background p-2" type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">{w('Through', 'Sehingga')}<input className="rounded border border-border bg-background p-2" type="date" max={through} value={end} onChange={e => setEnd(e.target.value)} /></label>
    </div>
    {!report ? <p role="alert">{w('Choose a valid period within the fixture cutoff.', 'Pilih tempoh sah dalam had masa data rekaan.')}</p> : <>
      <p role="status" className="text-sm">{currency} · {start} → {end} · {w('Exact equation difference', 'Perbezaan persamaan tepat')}: {money(report.equationDifference, currency)}</p>
      <div className="grid gap-4 md:grid-cols-2">{[
        { title: w('Balance sheet', 'Kunci kira-kira'), rows: [[w('Assets', 'Aset'), report.assets], [w('Liabilities', 'Liabiliti'), report.liabilities], [w('Equity including retained earnings', 'Ekuiti termasuk pendapatan tertahan'), report.equity], [w('Synthetic net worth', 'Nilai bersih rekaan'), report.netWorth]] },
        { title: w('Period income statement', 'Penyata pendapatan tempoh'), rows: [[w('Income', 'Pendapatan'), report.income], [w('Expenses', 'Perbelanjaan'), report.expenses], [w('Period surplus', 'Lebihan tempoh'), report.profit]] },
      ].map(section => <section className="rounded-xl border border-border p-4" key={section.title} aria-label={section.title}><h2 className="mb-3 font-semibold">{section.title}</h2><dl>{section.rows.map(([label, amount]) => <div className="flex justify-between gap-4 border-b border-border py-2" key={label}><dt>{label}</dt><dd className="shrink-0 tabular-nums">{money(amount, currency)}</dd></div>)}</dl></section>)}</div>
      <p className="text-sm text-muted-foreground">{w('Stocks and journals include all posted fixture activity through the end date; income and spending use the selected period. Transfers, principal and earmarks are excluded from spending. Negative signed balances indicate net credits.', 'Baki dan jurnal merangkumi semua catatan rekaan sehingga tarikh akhir; pendapatan dan perbelanjaan menggunakan tempoh pilihan. Pindahan, prinsipal dan peruntukan tidak dikira sebagai perbelanjaan. Baki negatif menunjukkan kredit bersih.')}</p>
      <section aria-label={w('Ledger accounts', 'Akaun lejar')}>
        <h2 className="mb-3 font-semibold">{w('Ledger accounts', 'Akaun lejar')}</h2>
        <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={w('Scroll ledger accounts', 'Tatal akaun lejar')}>
          <table className="min-w-[34rem] w-full text-left text-sm"><thead><tr><th className="p-2">{w('Account', 'Akaun')}</th><th className="p-2">{w('Classification', 'Klasifikasi')}</th><th className="p-2">{w('Signed balance', 'Baki bertanda')}</th></tr></thead><tbody>{accounts.map(a => <tr key={a.id} className="border-t border-border"><td className="max-w-[16rem] break-words p-2">{a.code}</td><td className="p-2">{classes[a.classification]}</td><td className="whitespace-nowrap p-2 tabular-nums">{money(report.balances[a.id], currency)}</td></tr>)}</tbody></table>
        </div>
      </section>
      <section aria-label={w('Journal detail', 'Butiran jurnal')}>
        <h2 className="mb-3 font-semibold">{w('Journal detail', 'Butiran jurnal')}</h2>
        {!events.length && <p>{w('No posted entries in this currency.', 'Tiada catatan dalam mata wang ini.')}</p>}
        {events.map(e => <details className="border-b border-border py-3" key={e.id}>
          <summary className="cursor-pointer break-words">{e.financial_date} · {kinds[e.kind]} · {e.request_key}</summary>
          {e.lines ? <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={`${w('Scroll journal', 'Tatal jurnal')} ${e.request_key}`}>
            <table className="min-w-[34rem] w-full text-left text-sm"><thead><tr><th className="p-2">{w('Account', 'Akaun')}</th><th className="p-2">{w('Debit', 'Debit')}</th><th className="p-2">{w('Credit', 'Kredit')}</th></tr></thead><tbody>{e.lines.map(l => <tr key={`${l.account_id}:${l.side}`}><td className="max-w-[16rem] break-words p-2">{l.account_id}</td><td className="whitespace-nowrap p-2 tabular-nums">{l.side === 'debit' ? money(l.amount, currency) : '—'}</td><td className="whitespace-nowrap p-2 tabular-nums">{l.side === 'credit' ? money(l.amount, currency) : '—'}</td></tr>)}</tbody></table>
          </div> : <p>{w('Goal earmark; no cash movement', 'Peruntukan matlamat; tiada aliran tunai')} · {money(e.allocation_amount!, currency)}</p>}
        </details>)}
      </section>
    </>}
  </div>;
}

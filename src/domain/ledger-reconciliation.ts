import type { Currency } from '../types/index';
import { parseMoney, parseMoneyTotal, decimalMoney } from './money.ts';
import { accountingReport, buildPosting } from './accounting.ts';
import type { LedgerAccount, LedgerReadLine, Posting, PostedEvent } from './accounting.ts';
import { ledgerInstant, normalizeLedgerInstant as instant, compareLedgerInstants } from './ledger-instant.ts';

type Owned = { id: string; user_id: string; currency: Currency };
type HistoricalAccount = Owned & { opening_balance: string };
type HistoricalDebt = Owned & { direction: 'i_owe' | 'owed_to_me'; original_amount: string };
type HistoricalTransaction = Owned & { amount: string; type: 'income' | 'expense'; account_id: string | null; transaction_date: string };
type HistoricalTransfer = Omit<Owned, 'currency'> & { source_account_id: string; destination_account_id: string; source_currency: Currency; destination_currency: Currency; source_amount: string; destination_amount: string; occurred_at: string };
type HistoricalRepayment = Owned & { debt_id: string; amount: string | null; transaction_id: string | null; account_id: string | null; paid_at: string };
type HistoricalContribution = Owned & { objective_id: string; amount: string | null; transaction_id: string | null; account_id: string | null; transfer_id: string | null; contributed_at: string };
export interface HistoricalFixture {
  fixture_kind: 'synthetic'; user_id: string; timezone: string; cutoff: string;
  approved_opening_at: Record<string, string>; approved_debt_opening_at: Record<string, string>;
  accounts: HistoricalAccount[]; transactions: HistoricalTransaction[]; transfers: HistoricalTransfer[];
  person_debts: HistoricalDebt[]; debt_repayments: HistoricalRepayment[]; objective_contributions: HistoricalContribution[];
  objectives: Owned[]; known_deleted_ids?: string[];
}
export interface TranslationException { source: string; id: string; code: string }
export interface Translation {
  accounts: LedgerAccount[]; postings: Posting[]; exceptions: TranslationException[];
  deferred: TranslationException[]; comparable: boolean;
}
const currencies: Currency[] = ['MYR', 'USD', 'EUR', 'JPY'];
export function financialDate(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', era: 'short' }).formatToParts(ledgerInstant(instant).calendarDate);
  const value = (kind: string) => parts.find(p => p.type === kind)!.value;
  if (value('era') !== 'AD' || Number(value('year')) > 9999) throw new Error('Financial calendar date outside supported range.');
  return `${value('year').padStart(4, '0')}-${value('month')}-${value('day')}`;
}

/** Pure translation; no connector, credential, descriptions or provider target. */
export function translateHistory(f: HistoricalFixture): Translation {
  if (f.fixture_kind !== 'synthetic') throw new Error('Only explicitly synthetic fixtures are accepted by this local tool.');
  const cutoff = instant(f.cutoff); financialDate(cutoff, f.timezone);
  const result: Translation = { accounts: [], postings: [], exceptions: [], deferred: [], comparable: false };
  const exception = (source: string, id: string, code: string) => result.exceptions.push({ source, id, code });
  const addAccount = (id: string, classification: LedgerAccount['classification'], currency: Currency) => {
    result.accounts.push({ id, code: id, classification, currency }); return id;
  };
  const controls = Object.fromEntries(currencies.map(c => [c, { equity: addAccount(`equity:${c}`, 'equity', c), income: addAccount(`income:${c}`, 'income', c), expense: addAccount(`expense:${c}`, 'expense', c) }])) as Record<Currency, { equity: string; income: string; expense: string }>;
  const cash = new Map<string, string>(), debt = new Map<string, string>();
  const owned = (source: string, row: { id: string; user_id: string }) => { if (row.user_id !== f.user_id) { exception(source, row.id, 'owner_mismatch'); return false; } return true; };
  const effective = (source: string, id: string, at: string) => {
    try { const value = instant(at); if (value > cutoff) { result.deferred.push({ source, id, code: 'future_unposted' }); return null; } return value; }
    catch { exception(source, id, 'invalid_instant'); return null; }
  };
  const post = (source: string, row: Owned, at: string, action: Parameters<typeof buildPosting>[1]) => {
    if (!owned(source, row)) return;
    const occurred_at = effective(source, row.id, at); if (!occurred_at) return;
    try { result.postings.push({ ...buildPosting({ request_key: `legacy:${source}:${row.id}`, currency: row.currency, occurred_at }, action), legacy_source: source, legacy_id: row.id }); }
    catch { exception(source, row.id, 'invalid_money_or_posting'); }
  };
  for (const row of [...f.accounts].sort(byId)) {
    if (!owned('accounts', row)) continue;
    try {
      const n = parseMoney(row.opening_balance, row.currency);
      const at = f.approved_opening_at[row.id];
      if (n !== 0n && !at) { exception('accounts', row.id, 'opening_date_requires_approval'); continue; }
      if (at) instant(at); // Even zero openings with supplied approval must be representable.
      if (n !== 0n && !effective('accounts', row.id, at)) { exception('accounts', row.id, 'opening_unavailable_at_cutoff'); continue; }
      cash.set(row.id, addAccount(`cash:${row.id}`, 'asset', row.currency));
      if (n !== 0n) post('accounts', row, at, { kind: 'opening', account: cash.get(row.id)!, equity: controls[row.currency].equity, amount: row.opening_balance, classification: 'asset' });
    } catch { exception('accounts', row.id, 'invalid_currency_or_opening'); }
  }
  for (const row of [...f.person_debts].sort(byId)) {
    if (!owned('person_debts', row)) continue;
    const at = f.approved_debt_opening_at[row.id];
    if (!at) { exception('person_debts', row.id, 'origination_or_opening_requires_approval'); continue; }
    if (!effective('person_debts', row.id, at)) continue;
    const classification = row.direction === 'i_owe' ? 'liability' : 'asset';
    debt.set(row.id, addAccount(`debt:${row.id}`, classification, row.currency));
    post('person_debts', row, at, { kind: 'opening', account: debt.get(row.id)!, equity: controls[row.currency].equity, amount: row.original_amount, classification });
  }
  const repaymentsByTx = new Map<string, HistoricalRepayment[]>(), contributionsByTx = new Map<string, HistoricalContribution[]>();
  for (const r of f.debt_repayments) if (r.transaction_id) repaymentsByTx.set(r.transaction_id, [...(repaymentsByTx.get(r.transaction_id) ?? []), r]);
  for (const r of f.objective_contributions) if (r.transaction_id) contributionsByTx.set(r.transaction_id, [...(contributionsByTx.get(r.transaction_id) ?? []), r]);
  const compatibleCash = (source: string, row: Owned, accountId: string | null, at: string) => {
    const account = f.accounts.find(a => a.id === accountId && a.user_id === f.user_id && a.currency === row.currency);
    if (!account || !cash.has(account.id)) { exception(source, row.id, 'missing_or_unassigned_cash'); return null; }
    if (f.approved_opening_at[account.id] && compareLedgerInstants(at, f.approved_opening_at[account.id]) < 0) { exception(source, row.id, 'activity_before_approved_opening'); return null; }
    return cash.get(account.id)!;
  };
  for (const row of [...f.transactions].sort(byId)) {
    if (!owned('transactions', row)) continue;
    if (!effective('transactions', row.id, row.transaction_date)) continue;
    if (contributionsByTx.has(row.id)) { exception('transactions', row.id, 'ambiguous_linked_goal_cash'); continue; }
    const links = repaymentsByTx.get(row.id) ?? [];
    if (links.length > 1) { exception('transactions', row.id, 'duplicate_principal_links'); continue; }
    if (links.length === 1) continue;
    const account = compatibleCash('transactions', row, row.account_id, row.transaction_date); if (!account) continue;
    post('transactions', row, row.transaction_date, row.type === 'income' ? { kind: 'income', cash: account, income: controls[row.currency].income, amount: row.amount } : { kind: 'expense', cash: account, expense: controls[row.currency].expense, amount: row.amount });
  }
  for (const row of [...f.transfers].sort(byId)) {
    if (!owned('transfers', row)) continue;
    if (!effective('transfers', row.id, row.occurred_at)) continue;
    if (row.source_currency !== row.destination_currency) { exception('transfers', row.id, 'cross_currency_requires_fx_policy'); continue; }
    const translated = { ...row, currency: row.source_currency };
    const source = compatibleCash('transfers', translated, row.source_account_id, row.occurred_at), destination = compatibleCash('transfers', translated, row.destination_account_id, row.occurred_at);
    if (!source || !destination) continue;
    if (parseMoney(row.source_amount, row.source_currency) !== parseMoney(row.destination_amount, row.destination_currency)) { exception('transfers', row.id, 'transfer_not_conserved'); continue; }
    post('transfers', translated, row.occurred_at, { kind: 'transfer', source, destination, amount: row.source_amount });
  }
  for (const row of [...f.debt_repayments].sort(byId)) {
    if (!owned('debt_repayments', row)) continue;
    const tx = f.transactions.find(t => t.id === row.transaction_id);
    if (!effective('debt_repayments', row.id, row.paid_at)) continue;
    const parent = f.person_debts.find(d => d.id === row.debt_id && d.user_id === f.user_id && d.currency === row.currency);
    if (!parent || !debt.has(parent.id)) { exception('debt_repayments', row.id, 'missing_or_unmapped_debt'); continue; }
    if (compareLedgerInstants(row.paid_at, f.approved_debt_opening_at[parent.id]) < 0) { exception('debt_repayments', row.id, 'repayment_before_approved_opening'); continue; }
    if (row.transaction_id && (!tx || tx.user_id !== f.user_id || tx.currency !== row.currency || tx.type !== (parent.direction === 'i_owe' ? 'expense' : 'income') || instant(tx.transaction_date) !== instant(row.paid_at) || (repaymentsByTx.get(tx.id)?.length !== 1) || contributionsByTx.has(tx.id) || row.amount !== null || row.account_id !== null)) { exception('debt_repayments', row.id, 'ambiguous_or_missing_transaction_link'); continue; }
    const account = compatibleCash('debt_repayments', row, tx?.account_id ?? row.account_id, row.paid_at); if (!account) continue;
    const amount = tx?.amount ?? row.amount;
    if (!amount) { exception('debt_repayments', row.id, 'missing_principal_amount'); continue; }
    post('debt_repayments', row, row.paid_at, parent.direction === 'i_owe'
      ? { kind: 'loan_payment', cash: account, liability: debt.get(parent.id)!, interestExpense: controls[row.currency].expense, principal: amount, interest: '0' }
      : { kind: 'transfer', source: debt.get(parent.id)!, destination: account, amount });
  }
  for (const row of [...f.objective_contributions].sort(byId)) {
    if (!owned('objective_contributions', row)) continue;
    if (!effective('objective_contributions', row.id, row.contributed_at)) continue;
    if (row.transaction_id) { exception('objective_contributions', row.id, 'ambiguous_linked_goal_cash'); continue; }
    if (!f.objectives.some(g => g.id === row.objective_id && g.user_id === f.user_id && g.currency === row.currency)) { exception('objective_contributions', row.id, 'missing_goal'); continue; }
    const transfer = f.transfers.find(t => t.id === row.transfer_id);
    if (row.transfer_id && (!transfer || !result.postings.some(p => p.legacy_source === 'transfers' && p.legacy_id === row.transfer_id) || transfer.destination_currency !== row.currency || row.amount === null || parseMoney(transfer.destination_amount, row.currency) !== parseMoney(row.amount, row.currency) || (row.account_id && row.account_id !== transfer.destination_account_id) || instant(transfer.occurred_at) !== instant(row.contributed_at))) { exception('objective_contributions', row.id, 'ambiguous_transfer_allocation'); continue; }
    if (row.account_id && !f.accounts.some(a => a.id === row.account_id && a.user_id === f.user_id && a.currency === row.currency)) { exception('objective_contributions', row.id, 'missing_allocation_account'); continue; }
    if (!row.amount) { exception('objective_contributions', row.id, 'missing_allocation_amount'); continue; }
    post('objective_contributions', row, row.contributed_at, { kind: 'goal_earmark', goal_id: row.objective_id, amount: row.amount });
  }
  for (const parent of [...f.person_debts].sort(byId).filter(d => d.user_id === f.user_id)) {
    try {
      const repaid = f.debt_repayments.filter(r => r.user_id === f.user_id && r.debt_id === parent.id && compareLedgerInstants(r.paid_at, cutoff) <= 0)
        .reduce((n, r) => n + parseMoney(r.amount ?? f.transactions.find(t => t.id === r.transaction_id)?.amount ?? '0', parent.currency), 0n);
      if (repaid > parseMoney(parent.original_amount, parent.currency)) exception('person_debts', parent.id, 'historical_principal_exceeds_original');
    } catch { exception('person_debts', parent.id, 'invalid_principal_history'); }
  }
  for (const id of [...(f.known_deleted_ids ?? [])].sort()) exception('history', id, 'deleted_history_not_reconstructable');
  const seen = new Set<string>();
  for (const p of result.postings) { if (seen.has(p.request_key)) exception(p.legacy_source!, p.legacy_id!, 'duplicate_source_id'); seen.add(p.request_key); }
  result.postings.sort((a, b) => compareLedgerInstants(a.occurred_at, b.occurred_at) || a.request_key.localeCompare(b.request_key));
  result.exceptions.sort(byException); result.deferred.sort(byException);
  result.comparable = result.exceptions.length === 0;
  return result;
}
const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
const byException = (a: TranslationException, b: TranslationException) => `${a.source}:${a.id}:${a.code}`.localeCompare(`${b.source}:${b.id}:${b.code}`);

/** Identifiers and aggregates only; never echo source descriptions or row amounts. */
export function reconcileHistory(f: HistoricalFixture, translated = translateHistory(f)) {
  const day = financialDate(f.cutoff, f.timezone);
  const lines: LedgerReadLine[] = translated.postings.flatMap(p => (p.lines ?? []).map(l => ({ ...l, event_id: p.request_key, currency: p.currency, financial_date: financialDate(p.occurred_at, f.timezone), classification: translated.accounts.find(a => a.id === l.account_id)!.classification })));
  const present = (at: string) => compareLedgerInstants(at, f.cutoff) <= 0;
  const comparisons: { source: string; id: string; currency: Currency; date: string; expected: string; actual: string; difference: string }[] = [];
  const compare = (source: string, id: string, currency: Currency, expected: bigint, actual: bigint, date = day) => comparisons.push({ source, id, currency, date, expected: decimalMoney(expected, currency), actual: decimalMoney(actual, currency), difference: decimalMoney(actual - expected, currency) });
  const reports = currencies.map(c => accountingReport(translated.accounts, lines, c, day.slice(0, 7) + '-01', day));
  for (const a of f.accounts.filter(a => a.user_id === f.user_id)) {
    let expected = parseMoney(a.opening_balance, a.currency);
    for (const t of f.transactions.filter(t => t.account_id === a.id && t.user_id === f.user_id && t.currency === a.currency && present(t.transaction_date))) expected += parseMoney(t.amount, a.currency) * (t.type === 'income' ? 1n : -1n);
    for (const t of f.transfers.filter(t => t.user_id === f.user_id && present(t.occurred_at))) {
      if (t.source_account_id === a.id && t.source_currency === a.currency) expected -= parseMoney(t.source_amount, a.currency);
      if (t.destination_account_id === a.id && t.destination_currency === a.currency) expected += parseMoney(t.destination_amount, a.currency);
    }
    for (const r of f.debt_repayments.filter(r => r.account_id === a.id && r.user_id === f.user_id && r.currency === a.currency && !r.transaction_id && present(r.paid_at))) {
      const parent = f.person_debts.find(d => d.id === r.debt_id); if (parent && r.amount) expected += parseMoney(r.amount, a.currency) * (parent.direction === 'i_owe' ? -1n : 1n);
    }
    compare('accounts', a.id, a.currency, expected, parseMoneyTotal(reports.find(r => r.currency === a.currency)!.balances[`cash:${a.id}`] ?? '0', a.currency));
  }
  const linkTx = new Set([...f.debt_repayments, ...f.objective_contributions].map(r => r.transaction_id));
  const months = [...new Set(f.transactions.filter(t => t.user_id === f.user_id && present(t.transaction_date)).map(t => financialDate(t.transaction_date, f.timezone).slice(0, 7)))].sort();
  for (const c of currencies) for (const month of months) {
    const report = accountingReport(translated.accounts, lines, c, `${month}-01`, month === day.slice(0, 7) ? day : `${month}-31`);
    for (const type of ['income', 'expense'] as const) {
      const expected = f.transactions.filter(t => t.user_id === f.user_id && t.currency === c && t.type === type && !linkTx.has(t.id) && present(t.transaction_date) && financialDate(t.transaction_date, f.timezone).startsWith(month)).reduce((n, t) => n + parseMoney(t.amount, c), 0n);
      compare(type, month, c, expected, parseMoneyTotal(type === 'income' ? report.income : report.expenses, c), month);
    }
  }
  for (const d of f.person_debts.filter(d => d.user_id === f.user_id)) {
    const repaid = f.debt_repayments.filter(r => r.user_id === f.user_id && r.debt_id === d.id && present(r.paid_at)).reduce((n, r) => { const amount = r.amount ?? f.transactions.find(t => t.id === r.transaction_id)?.amount; return n + parseMoney(amount ?? '0', d.currency); }, 0n);
    const raw = parseMoneyTotal(reports.find(r => r.currency === d.currency)!.balances[`debt:${d.id}`] ?? '0', d.currency);
    compare('person_debts', d.id, d.currency, parseMoney(d.original_amount, d.currency) - repaid, d.direction === 'i_owe' ? -raw : raw);
  }
  for (const goal of f.objectives.filter(g => g.user_id === f.user_id)) {
    const expected = f.objective_contributions.filter(r => r.user_id === f.user_id && r.objective_id === goal.id && present(r.contributed_at)).reduce((n, r) => n + parseMoney(r.amount ?? f.transactions.find(t => t.id === r.transaction_id)?.amount ?? '0', goal.currency), 0n);
    const actual = translated.postings.filter(p => p.goal_id === goal.id).reduce((n, p) => n + parseMoney(p.allocation_amount!, goal.currency), 0n);
    compare('objectives', goal.id, goal.currency, expected, actual);
  }
  const balanced = reports.every(r => parseMoneyTotal(r.equationDifference, r.currency) === 0n);
  return { mode: 'synthetic-dry-run', cutoff: f.cutoff, timezone: f.timezone, exactToleranceMinorUnits: '0', comparable: translated.comparable, accepted: translated.comparable && balanced && comparisons.every(c => parseMoneyTotal(c.difference, c.currency) === 0n), counts: { accounts: translated.accounts.length, events: translated.postings.length, exceptions: translated.exceptions.length, deferred: translated.deferred.length }, exceptions: translated.exceptions, deferred: translated.deferred, comparisons, balanceSheets: reports.map(r => ({ currency: r.currency, assets: r.assets, liabilities: r.liabilities, equity: r.equity, netWorth: r.netWorth, income: r.income, expenses: r.expenses, profit: r.profit, equationDifference: r.equationDifference })), balanced };
}

/** Applies only to explicitly created local fixture DB adapters, never Supabase. */
export function materializeFixture(t: Translation, timezone: string): { events: PostedEvent[]; lines: LedgerReadLine[] } {
  const events = t.postings.map(p => ({ ...p, id: p.request_key, financial_date: financialDate(p.occurred_at, timezone) }));
  return { events, lines: events.flatMap(p => (p.lines ?? []).map(l => ({ ...l, event_id: p.id, currency: p.currency, financial_date: p.financial_date, classification: t.accounts.find(a => a.id === l.account_id)!.classification }))) };
}

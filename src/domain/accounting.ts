import type { Currency } from '../types/index';
import { parseMoney, parseMoneyTotal, decimalMoney } from './money.ts';
import { normalizeLedgerInstant } from './ledger-instant.ts';

export type LedgerClass = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export interface LedgerAccount { id: string; code: string; classification: LedgerClass; currency: Currency }
export interface LedgerLine { account_id: string; side: 'debit' | 'credit'; amount: string }
export type PostingKind = 'income' | 'salary' | 'expense' | 'split_expense' | 'transfer' | 'opening' | 'loan_payment' | 'card_settlement' | 'goal_earmark' | 'goal_transfer' | 'refund' | 'reversal' | 'adjustment';
export interface Posting {
  request_key: string; kind: PostingKind; currency: Currency; occurred_at: string;
  lines?: LedgerLine[]; goal_id?: string; allocation_amount?: string;
  reverses_event_id?: string; reason_code?: string; legacy_source?: string; legacy_id?: string;
}
export interface PostedEvent extends Posting { id: string; financial_date: string }

/** This builder never posts or writes legacy records. The DB remains the gate. */
export function buildPosting(base: Pick<Posting, 'request_key' | 'currency' | 'occurred_at'>, action:
  | { kind: 'income' | 'salary'; cash: string; income: string; amount: string }
  | { kind: 'expense' | 'refund'; cash: string; expense: string; amount: string }
  | { kind: 'transfer' | 'goal_transfer'; source: string; destination: string; amount: string; goal_id?: string }
  | { kind: 'opening'; account: string; equity: string; amount: string; classification: 'asset' | 'liability' }
  | { kind: 'loan_payment'; cash: string; liability: string; interestExpense: string; principal: string; interest: string }
  | { kind: 'card_settlement'; cash: string; liability: string; amount: string }
  | { kind: 'split_expense'; cash: string; splits: { expense: string; amount: string }[] }
  | { kind: 'goal_earmark'; goal_id: string; amount: string }
  | { kind: 'reversal'; reverses_event_id: string }
  | { kind: 'adjustment'; reason_code: string; lines: LedgerLine[] }
): Posting {
  const positive = (value: string) => { const n = parseMoney(value, base.currency); if (n <= 0n) throw new Error('Amount must be positive.'); return decimalMoney(n, base.currency); };
  const line = (account_id: string, side: LedgerLine['side'], amount: string): LedgerLine => ({ account_id, side, amount: positive(amount) });
  const pair = (debit: string, credit: string, amount: string) => [line(debit, 'debit', amount), line(credit, 'credit', amount)];
  const p: Posting = { ...base, occurred_at: normalizeLedgerInstant(base.occurred_at), kind: action.kind };
  switch (action.kind) {
    case 'income': case 'salary': p.lines = pair(action.cash, action.income, action.amount); break;
    case 'expense': p.lines = pair(action.expense, action.cash, action.amount); break;
    case 'refund': p.lines = pair(action.cash, action.expense, action.amount); break;
    case 'transfer': case 'goal_transfer':
      if (action.source === action.destination) throw new Error('Choose distinct transfer accounts.');
      p.lines = pair(action.destination, action.source, action.amount);
      if (action.kind === 'goal_transfer') { if (!action.goal_id) throw new Error('Goal required.'); p.goal_id = action.goal_id; p.allocation_amount = positive(action.amount); }
      break;
    case 'opening': {
      const n = parseMoney(action.amount, base.currency);
      if (n === 0n) throw new Error('Zero opening needs no journal.');
      const amount = decimalMoney(n < 0n ? -n : n, base.currency);
      const debitAccount = (action.classification === 'asset') === (n > 0n);
      p.lines = pair(debitAccount ? action.account : action.equity, debitAccount ? action.equity : action.account, amount);
      break;
    }
    case 'loan_payment': {
      const principal = positive(action.principal), interest = parseMoney(action.interest, base.currency);
      if (interest < 0n) throw new Error('Interest cannot be negative.');
      const total = decimalMoney(parseMoney(principal, base.currency) + interest, base.currency);
      p.lines = [line(action.liability, 'debit', principal), ...(interest > 0n ? [line(action.interestExpense, 'debit', action.interest)] : []), line(action.cash, 'credit', total)];
      break;
    }
    case 'card_settlement': p.lines = pair(action.liability, action.cash, action.amount); break;
    case 'split_expense': {
      if (action.splits.length < 2) throw new Error('Provide at least two expense splits.');
      const total = action.splits.reduce((n, s) => n + parseMoney(positive(s.amount), base.currency), 0n);
      p.lines = [...action.splits.map(s => line(s.expense, 'debit', s.amount)), line(action.cash, 'credit', decimalMoney(total, base.currency))];
      break;
    }
    case 'goal_earmark': p.goal_id = action.goal_id; p.allocation_amount = positive(action.amount); break;
    case 'reversal': p.reverses_event_id = action.reverses_event_id; break;
    case 'adjustment': if (!action.reason_code) throw new Error('Adjustment reason required.'); p.reason_code = action.reason_code; p.lines = action.lines.map(l => line(l.account_id, l.side, l.amount)); break;
  }
  if (p.lines) {
    if (p.lines.length < 2 || p.lines.length > 64) throw new Error('Expected 2 to 64 journal lines.');
    if (new Set(p.lines.map(l => `${l.account_id}:${l.side}`)).size !== p.lines.length) throw new Error('Use one journal line per account and side.');
    if (p.lines.reduce((net, l) => net + (l.side === 'debit' ? 1n : -1n) * parseMoney(l.amount, p.currency), 0n) !== 0n) throw new Error('Journal must balance exactly.');
  }
  return p;
}

export interface LedgerReadLine extends LedgerLine { event_id: string; currency: Currency; financial_date: string; classification: LedgerClass }
/** Stocks include all activity through end; flows only include the chosen period. */
export function accountingReport(accounts: LedgerAccount[], lines: LedgerReadLine[], currency: Currency, start: string, end: string) {
  const balances = new Map(accounts.filter(a => a.currency === currency).map(a => [a.id, 0n]));
  let income = 0n, expenses = 0n, retained = 0n;
  for (const l of lines) {
    if (l.currency !== currency || l.financial_date > end) continue;
    const n = parseMoneyTotal(l.amount, currency) * (l.side === 'debit' ? 1n : -1n);
    if (!balances.has(l.account_id)) throw new Error('Report account is missing.');
    balances.set(l.account_id, balances.get(l.account_id)! + n);
    if (l.classification === 'income') { retained -= n; if (l.financial_date >= start) income -= n; }
    if (l.classification === 'expense') { retained -= n; if (l.financial_date >= start) expenses += n; }
  }
  let assets = 0n, liabilities = 0n, openingEquity = 0n;
  for (const a of accounts.filter(a => a.currency === currency)) {
    const n = balances.get(a.id)!;
    if (a.classification === 'asset') assets += n;
    if (a.classification === 'liability') liabilities -= n;
    if (a.classification === 'equity') openingEquity -= n;
  }
  const equity = openingEquity + retained;
  return { currency, assets: decimalMoney(assets, currency), liabilities: decimalMoney(liabilities, currency), equity: decimalMoney(equity, currency), netWorth: decimalMoney(assets - liabilities, currency), income: decimalMoney(income, currency), expenses: decimalMoney(expenses, currency), profit: decimalMoney(income - expenses, currency), equationDifference: decimalMoney(assets - liabilities - equity, currency), balances: Object.fromEntries([...balances].map(([id, n]) => [id, decimalMoney(n, currency)])) };
}

import { describe, expect, it } from 'vitest';
import { buildPosting, accountingReport } from './accounting';
import { translateHistory, reconcileHistory, materializeFixture, financialDate } from './ledger-reconciliation';
import fixture from '../../supabase/tests/ledger-history.synthetic.json';
import type { HistoricalFixture } from './ledger-reconciliation';
const base = { request_key: 'fixture', currency: 'MYR' as const, occurred_at: '2000-02-01T00:00:00Z' };
const f = () => structuredClone(fixture) as HistoricalFixture;
describe('exact deterministic accounting', () => {
  it('maps salary and groceries without floating point', () => {
    expect(buildPosting(base, { kind: 'salary', cash: 'cash', income: 'salary', amount: '5000' }).lines).toEqual([{ account_id: 'cash', side: 'debit', amount: '5000.00' }, { account_id: 'salary', side: 'credit', amount: '5000.00' }]);
    expect(buildPosting(base, { kind: 'expense', cash: 'cash', expense: 'food', amount: '100' }).lines?.[0]).toEqual({ account_id: 'food', side: 'debit', amount: '100.00' });
  });
  it('splits RM600 loan payment into 480 principal and 120 interest', () => {
    expect(buildPosting(base, { kind: 'loan_payment', cash: 'cash', liability: 'loan', interestExpense: 'interest', principal: '480', interest: '120' }).lines).toEqual([{ account_id: 'loan', side: 'debit', amount: '480.00' }, { account_id: 'interest', side: 'debit', amount: '120.00' }, { account_id: 'cash', side: 'credit', amount: '600.00' }]);
  });
  it('settles cards without a second expense and refunds with inverse direction', () => {
    expect(buildPosting(base, { kind: 'card_settlement', cash: 'cash', liability: 'card', amount: '100' }).lines?.[0].account_id).toBe('card');
    expect(buildPosting(base, { kind: 'refund', cash: 'cash', expense: 'food', amount: '100' }).lines?.[0].side).toBe('debit');
  });
  it('handles signed opening balances and exact split totals', () => {
    expect(buildPosting(base, { kind: 'opening', account: 'cash', equity: 'equity', amount: '-0.10', classification: 'asset' }).lines?.[0].account_id).toBe('equity');
    expect(buildPosting(base, { kind: 'split_expense', cash: 'cash', splits: [{ expense: 'food', amount: '0.10' }, { expense: 'fees', amount: '0.20' }] }).lines?.at(-1)?.amount).toBe('0.30');
  });
  it('rejects excess precision, same-account transfers, negatives and unbalanced adjustments', () => {
    expect(() => buildPosting(base, { kind: 'expense', cash: 'cash', expense: 'food', amount: '1.001' })).toThrow();
    expect(() => buildPosting({ ...base, currency: 'JPY' }, { kind: 'expense', cash: 'cash', expense: 'food', amount: '1.01' })).toThrow();
    expect(() => buildPosting(base, { kind: 'transfer', source: 'cash', destination: 'cash', amount: '1' })).toThrow();
    expect(() => buildPosting(base, { kind: 'adjustment', reason_code: 'approved', lines: [{ account_id: 'cash', side: 'debit', amount: '1' }, { account_id: 'equity', side: 'credit', amount: '2' }] })).toThrow();
  });
  it('keeps goal earmarks cashless and atomic funded transfers traceable', () => {
    expect(buildPosting(base, { kind: 'goal_earmark', goal_id: 'goal', amount: '500' }).lines).toBeUndefined();
    expect(buildPosting(base, { kind: 'goal_transfer', source: 'cash', destination: 'savings', amount: '500', goal_id: 'goal' }).allocation_amount).toBe('500.00');
  });
  it('balances the synthetic history and independently matches legacy cash, flow, debt and funding', () => {
    const t = translateHistory(f()); expect(t.exceptions).toEqual([]); expect(t.deferred).toHaveLength(1);
    const report = reconcileHistory(f(), t); expect(report.accepted).toBe(true);
    const native = report.balanceSheets.find(r => r.currency === 'MYR')!;
    expect(native).toMatchObject({ assets: '15280.00', liabilities: '1500.00', equity: '13780.00', netWorth: '13780.00', income: '5000.00', expenses: '220.00', equationDifference: '0.00' });
    expect(report.comparisons.find(c => c.source === 'objectives')?.actual).toBe('600.00');
  });
  it('is deterministic across input ordering and leaks no descriptions', () => {
    const original = f(), reordered = f(); reordered.transactions.reverse(); reordered.accounts.reverse(); reordered.debt_repayments.reverse();
    expect(translateHistory(reordered)).toEqual(translateHistory(original));
    expect(JSON.stringify(reconcileHistory(original))).not.toContain('description');
  });
  it('reconciles exact beginning and intermediate cutoffs without posting future activity', () => {
    for (const cutoff of ['2000-01-01T00:00:00Z', '2000-02-02T00:00:00Z', '2000-02-04T00:00:00Z', '2000-02-06T00:00:00Z']) {
      const data = { ...f(), cutoff }; expect(reconcileHistory(data).accepted).toBe(true);
      expect(translateHistory(data).postings.every(p => p.occurred_at <= `${cutoff.slice(0, -1)}.000000Z`)).toBe(true);
    }
  });
  it('reports unassigned, missing opening, deleted and ambiguous linked history without guessing', () => {
    const data = f(); data.transactions[0].account_id = null; delete data.approved_opening_at[data.accounts[0].id]; data.known_deleted_ids = ['gone'];
    const report = reconcileHistory(data); expect(report.accepted).toBe(false);
    expect(report.exceptions.map(e => e.code)).toContain('opening_date_requires_approval');
    expect(report.exceptions.map(e => e.code)).toContain('deleted_history_not_reconstructable');
    const linked = f(); linked.objective_contributions.push({ ...linked.objective_contributions[1], id: 'ambiguous', amount: null, transaction_id: linked.transactions[1].id, account_id: null });
    expect(translateHistory(linked).exceptions.map(e => e.code)).toContain('ambiguous_linked_goal_cash');
  });
  it('rejects FX assumptions, owner mixing and date-mismatched principal links', () => {
    const data = f(); data.transfers[0].destination_currency = 'USD'; data.transactions[0].user_id = 'different-owner'; data.debt_repayments[2].paid_at = '2000-02-02T00:00:00Z';
    const codes = translateHistory(data).exceptions.map(e => e.code);
    expect(codes).toContain('owner_mismatch'); expect(codes).toContain('cross_currency_requires_fx_policy'); expect(codes).toContain('ambiguous_or_missing_transaction_link');
  });
  it('blocks historical principal that exceeds the original debt', () => {
    const data = f(); data.debt_repayments[0].amount = '2000.00';
    expect(translateHistory(data).exceptions.map(e => e.code)).toContain('historical_principal_exceeds_original');
    expect(reconcileHistory(data).accepted).toBe(false);
  });
  it('separates stock cutoff, period flows and native currencies', () => {
    const t = translateHistory(f()), { lines } = materializeFixture(t, f().timezone);
    const r = accountingReport(t.accounts, lines, 'MYR', '2000-02-05', '2000-02-29');
    expect(r.income).toBe('0.00'); expect(r.expenses).toBe('0.00'); expect(r.equity).toBe('13780.00');
    expect(accountingReport(t.accounts, lines, 'USD', '2000-01-01', '2000-02-29').assets).toBe('0.00');
    expect(financialDate('2000-01-31T16:00:00Z', 'Asia/Kuala_Lumpur')).toBe('2000-02-01');
  });
  it('keeps aggregates above the individual-entry cap exact', () => {
    const data = f(); data.transactions = [{ ...data.transactions[0], amount: '9999999999999999.99' }, { ...data.transactions[0], id: 'large-second-income', amount: '9999999999999999.99' }];
    data.debt_repayments = []; data.objective_contributions = []; data.transfers = [];
    expect(reconcileHistory(data).accepted).toBe(true);
    expect(reconcileHistory(data).balanceSheets.find(r => r.currency === 'MYR')?.income).toBe('19999999999999999.98');
  });
  it('rejects non-synthetic input and timezone-less timestamps', () => {
    expect(() => translateHistory({ ...f(), fixture_kind: 'production' } as unknown as HistoricalFixture)).toThrow();
    expect(() => translateHistory({ ...f(), cutoff: '2000-02-29' })).toThrow();
  });
});

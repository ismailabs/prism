import { describe, expect, it } from 'vitest';
import fixture from '../../supabase/tests/ledger-history.synthetic.json';
import { translateHistory, reconcileHistory, financialDate } from './ledger-reconciliation.ts';
import type { HistoricalFixture } from './ledger-reconciliation.ts';
import { ledgerInstant, normalizeLedgerInstant, compareLedgerInstants } from './ledger-instant.ts';
import { buildPosting } from './accounting.ts';

const fresh = () => structuredClone(fixture) as HistoricalFixture;
describe('historical microsecond boundaries', () => {
  it('includes before and exactly at cutoff, defers one microsecond after, independently reconciles and reruns', () => {
    const f = fresh(); f.cutoff = '2000-02-29T15:59:59.000100Z';
    const template = f.transactions[0];
    f.transactions = [
      { ...template, id: 'after', amount: '7.00', transaction_date: '2000-02-29T23:59:59.000101+08:00' },
      { ...template, id: 'exact', amount: '3.00', transaction_date: f.cutoff },
      { ...template, id: 'before', amount: '2.00', transaction_date: '2000-02-29T15:59:59.000099Z' },
    ];
    f.transfers = []; f.debt_repayments = []; f.objective_contributions = [];
    const t = translateHistory(f);
    expect(t.postings.filter(p => p.kind === 'income').map(p => [p.legacy_id, p.occurred_at])).toEqual([
      ['before', '2000-02-29T15:59:59.000099Z'], ['exact', f.cutoff],
    ]);
    expect(t.deferred).toEqual([{ source: 'transactions', id: 'after', code: 'future_unposted' }]);
    const r = reconcileHistory(f, t); expect(r.accepted).toBe(true);
    expect(r.balanceSheets.find(x => x.currency === 'MYR')?.income).toBe('5.00');
    f.transactions.reverse(); expect(translateHistory(f)).toEqual(t);
    expect(reconcileHistory(f)).toEqual(r);
  });
  it('does not collapse principal links or opening order within a millisecond', () => {
    const f = fresh(); const linked = f.debt_repayments.find(r => r.transaction_id)!;
    f.transactions.find(t => t.id === linked.transaction_id)!.transaction_date = '2000-02-03T00:00:00.000100Z';
    linked.paid_at = '2000-02-03T00:00:00.000900Z';
    expect(translateHistory(f).exceptions.map(e => e.code)).toContain('ambiguous_or_missing_transaction_link');
    const opening = fresh(); const tx = opening.transactions[0];
    opening.approved_opening_at[tx.account_id!] = '2000-02-01T00:00:00.000900Z';
    tx.transaction_date = '2000-02-01T00:00:00.000100Z';
    expect(translateHistory(opening).exceptions.map(e => e.code)).toContain('activity_before_approved_opening');
  });
  it('blocks unsupported precision and invalid calendar instants', () => {
    for (const cutoff of ['2000-02-29T15:59:59.0001001Z', '2000-02-30T00:00:00Z', '2000-02-29T24:00:00Z']) {
      expect(() => translateHistory({ ...fresh(), cutoff })).toThrow();
    }
    const f = fresh(); f.transactions[0].transaction_date = '2000-02-01T00:00:00.0000001Z';
    expect(translateHistory(f).exceptions.map(e => e.code)).toContain('invalid_instant');
    expect(() => reconcileHistory(f)).toThrow();
  });
  it('normalizes offsets without changing calendar boundaries', () => {
    expect(financialDate('2000-01-31T15:59:59.999999Z', 'Asia/Kuala_Lumpur')).toBe('2000-01-31');
    expect(financialDate('2000-01-31T16:00:00.000000Z', 'Asia/Kuala_Lumpur')).toBe('2000-02-01');
    const f = fresh(); const tx = f.transactions[0];
    tx.transaction_date = '1969-12-31T18:59:59.999999-05:00';
    f.approved_opening_at[tx.account_id!] = '1969-01-01T00:00:00Z';
    expect(translateHistory(f).postings.find(p => p.legacy_id === tx.id)?.occurred_at).toBe('1969-12-31T23:59:59.999999Z');
  });
  it('validates representable timestamps without overflow, rounding or invalid-date normalization', () => {
    expect(ledgerInstant('1969-12-31T23:59:59.999999Z').microseconds).toBe(-1n);
    expect(compareLedgerInstants('2000-02-29T15:59:59.000099Z', '2000-02-29T23:59:59.000100+08:00')).toBe(-1);
    expect(normalizeLedgerInstant('0001-01-01T00:00:00Z')).toBe('0001-01-01T00:00:00.000000Z');
    expect(normalizeLedgerInstant('9999-12-31T23:59:59.999999Z')).toBe('9999-12-31T23:59:59.999999Z');
    expect(financialDate('0001-01-01T00:00:00Z', 'UTC')).toBe('0001-01-01');
    expect(() => financialDate('0001-01-01T00:00:00Z', 'America/New_York')).toThrow();
    expect(() => financialDate('9999-12-31T23:59:59Z', 'Asia/Kuala_Lumpur')).toThrow();
    for (const value of ['1900-02-29T00:00:00Z', '0000-01-01T00:00:00Z', '2000-02-01T00:00:60Z', '2000-02-01T00:00:00+16:00', '2000-02-01T00:00:00+08:60', '0001-01-01T00:00:00+01:00', '9999-12-31T23:59:59-01:00', '2000-02-01', '2000-02-01T00:00:00.0000000Z']) {
      expect(() => ledgerInstant(value)).toThrow();
      expect(() => buildPosting({request_key:'invalid',currency:'MYR',occurred_at:value}, {kind:'goal_earmark',goal_id:'goal',amount:'1'})).toThrow();
    }
  });
  it('compares transfer allocations and debt openings at microsecond precision', () => {
    const f = fresh(); f.transfers[0].occurred_at = '2000-02-05T00:00:00.000100Z';
    f.objective_contributions[0].contributed_at = '2000-02-05T00:00:00.000101Z';
    expect(translateHistory(f).exceptions.map(e=>e.code)).toContain('ambiguous_transfer_allocation');
    const debt = fresh(); const repayment = debt.debt_repayments[0];
    debt.approved_debt_opening_at[repayment.debt_id] = '2000-02-04T00:00:00.000101Z';
    repayment.paid_at = '2000-02-04T00:00:00.000100Z';
    expect(translateHistory(debt).exceptions.map(e=>e.code)).toContain('repayment_before_approved_opening');
  });
});

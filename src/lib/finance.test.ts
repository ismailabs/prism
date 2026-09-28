import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCategoryBreakdown, getMonthlyCashFlow, OptimisticLedger, summarizeTransactions } from '@/lib/finance';
import { convertCurrency, formatCurrency, isExchangeRates, MAX_STALE_RATE_MS } from '@/services/currency';
import type { Category, ExchangeRates, Transaction } from '@/types';

const timestamp = new Date('2026-09-15T12:00:00Z').getTime();
function rates(): ExchangeRates { return { base: 'USD', rates: { USD: 1, EUR: 0.8, JPY: 150, MYR: 4 }, updatedAt: timestamp, source: 'verified-test-provider' }; }
function transaction(overrides: Partial<Transaction>): Transaction {
  return { id: crypto.randomUUID(), user_id: 'user-1', amount: '100.00', currency: 'USD', type: 'expense', category_id: null, payment_method_id: null, description: 'Purchase', transaction_date: '2026-09-10T12:00:00Z', created_at: '2026-09-10T12:00:00Z', ...overrides };
}
afterEach(() => vi.useRealTimers());

describe('currency conversion', () => {
  it('converts via the original transaction currency and preserves round-trip value', () => {
    vi.useFakeTimers().setSystemTime(timestamp);
    expect(convertCurrency(200, 'MYR', 'EUR', rates())).toBeCloseTo(40);
    expect(convertCurrency(convertCurrency(123.45, 'USD', 'JPY', rates()), 'JPY', 'USD', rates())).toBeCloseTo(123.45);
  });

  it('allows same-currency rendering offline while refusing invented or expired exchange rates', () => {
    vi.useFakeTimers().setSystemTime(timestamp);
    expect(convertCurrency(28.5, 'USD', 'USD', null)).toBe(28.5);
    expect(() => convertCurrency(28.5, 'USD', 'MYR', null)).toThrow('exchange rates');
    expect(() => convertCurrency(28.5, 'USD', 'MYR', { ...rates(), updatedAt: timestamp - MAX_STALE_RATE_MS - 1 })).toThrow('exchange rates');
    expect(() => convertCurrency(Number.NaN, 'USD', 'USD', rates())).toThrow('finite');
  });

  it('rejects malformed provider data and formats JPY without fractional digits', () => {
    vi.useFakeTimers().setSystemTime(timestamp);
    expect(isExchangeRates(rates())).toBe(true);
    expect(isExchangeRates({ ...rates(), rates: { USD: 1, EUR: 0, JPY: 150, MYR: 4 } })).toBe(false);
    expect(isExchangeRates({ ...rates(), rates: { USD: 2, EUR: 0.8, JPY: 150, MYR: 4 } })).toBe(false);
    expect(isExchangeRates({ ...rates(), updatedAt: timestamp + 3_600_000 })).toBe(false);
    expect(formatCurrency(1250.4, 'JPY', 'en')).toBe('¥1,250');
  });
});

describe('financial aggregation', () => {
  it('converts mixed currencies, excludes future entries, and computes current spending velocity', () => {
    vi.useFakeTimers().setSystemTime(timestamp);
    const summary = summarizeTransactions([
      transaction({ type: 'income', amount: '1000.00' }),
      transaction({ currency: 'MYR', amount: '400.00' }),
      transaction({ currency: 'EUR', amount: '80.00' }),
      transaction({ amount: '400.00', transaction_date: '2026-08-10T12:00:00Z' }),
      transaction({ amount: '999.00', transaction_date: '2026-09-30T12:00:00Z' }),
    ], 'USD', rates(), new Date(timestamp));
    expect(summary.income).toBe(1_000);
    expect(summary.expense).toBe(600);
    expect(summary.balance).toBe(400);
    expect(summary.monthlyExpense).toBe(200);
    expect(summary.savingsRate).toBe(80);
    expect(summary.projectedMonthlyExpense).toBe(400);
    expect(summary.spendingChangePercent).toBe(-50);
  });

  it('creates chronological empty months correctly across year boundaries', () => {
    vi.useFakeTimers().setSystemTime(timestamp);
    const months = getMonthlyCashFlow([
      transaction({ amount: '40.00', transaction_date: '2025-12-11T12:00:00Z' }),
      transaction({ amount: '80.00', type: 'income', transaction_date: '2026-01-12T12:00:00Z' }),
    ], 'USD', null, 3, new Date('2026-01-20T12:00:00Z'));
    expect(months.map((month) => month.key)).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(months.map((month) => [month.income, month.expense])).toEqual([[0, 0], [0, 40], [80, 0]]);
  });

  it('retains uncategorized expenses after category deletion and excludes income', () => {
    vi.useFakeTimers().setSystemTime(timestamp);
    const category: Category = { id: 'food', user_id: 'user-1', name: 'Food', type: 'expense', color: '#ff0000', created_at: '2026-09-01T00:00:00Z' };
    const data = getCategoryBreakdown([
      transaction({ category_id: 'food', amount: '40.00' }),
      transaction({ category_id: 'deleted-category', amount: '20.00' }),
      transaction({ category_id: null, amount: '10.00' }),
      transaction({ type: 'income', amount: '900.00' }),
    ], [category], 'USD', null, new Date(timestamp));
    expect(data.map((row) => [row.id, row.value])).toEqual([['food', 40], ['uncategorized', 30]]);
  });

  it('handles an empty account and a month without income without NaN or Infinity', () => {
    const summary = summarizeTransactions([], 'USD', null, new Date(timestamp));
    expect(summary.balance).toBe(0);
    expect(summary.savingsRate).toBe(0);
    expect(summary.projectedMonthlyExpense).toBe(0);
    expect(summary.spendingChangePercent).toBeNull();
  });
});

describe('queued optimistic rollback', () => {
  it('preserves a later pending update when the earlier update fails', () => {
    const ledger = new OptimisticLedger([{ id: '1', amount: 10, description: 'Original' }]);
    ledger.add({ token: 'first', apply: (rows) => rows.map((row) => ({ ...row, amount: 20 })) });
    ledger.add({ token: 'second', apply: (rows) => rows.map((row) => ({ ...row, description: 'Later edit' })) });
    expect(ledger.settle('first')).toEqual([{ id: '1', amount: 10, description: 'Later edit' }]);
    expect(ledger.settle('second', () => [{ id: '1', amount: 10, description: 'Later edit' }])).toEqual([{ id: '1', amount: 10, description: 'Later edit' }]);
    expect(ledger.pendingCount).toBe(0);
  });

  it('does not resurrect an optimistically deleted row when an earlier update succeeds', () => {
    const ledger = new OptimisticLedger([{ id: '1', amount: 10 }]);
    ledger.add({ token: 'update', apply: (rows) => rows.map((row) => ({ ...row, amount: 20 })) });
    ledger.add({ token: 'delete', apply: (rows) => rows.filter((row) => row.id !== '1') });
    expect(ledger.settle('update', () => [{ id: '1', amount: 20 }])).toEqual([]);
    expect(ledger.settle('delete')).toEqual([{ id: '1', amount: 20 }]);
  });

  it('rolls back one failed create without removing another pending create', () => {
    const ledger = new OptimisticLedger<{ id: string }>([]);
    ledger.add({ token: 'a', apply: (rows) => [...rows, { id: 'a' }] });
    ledger.add({ token: 'b', apply: (rows) => [...rows, { id: 'b' }] });
    expect(ledger.settle('a')).toEqual([{ id: 'b' }]);
  });
});

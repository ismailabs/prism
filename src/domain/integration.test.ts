import { describe, expect, it } from 'vitest';
import { budgetBalances } from './planning';
import { planningHighlights } from './planning-highlights';
import { accountingReport, buildPosting } from './accounting';
import type { LedgerAccount, LedgerReadLine } from './accounting';
import type { MonthlyBudget } from '@/types';

const budget = (month: string, spent?: string, extra: Partial<MonthlyBudget> = {}): MonthlyBudget => ({
  id: month, user_id: 'owner', category_id: 'food', currency: 'MYR', month: `${month}-01`,
  amount: '800.00', spent, rollover_enabled: true, alert_percent: 100, created_at: '', ...extra,
});

describe('integrated planning and accounting boundaries', () => {
  it.each([
    ['positive', '700.00', '850.00', '900.00', '50.00', 'healthy', false],
    ['negative', '900.00', '750.00', '700.00', '-50.00', 'over', true],
  ])('%s rollover agrees between dashboard and budget detail', (_, prior, spent, available, remaining, alert, reached) => {
    const rows = [budget('2026-10', spent), budget('2026-09', prior)];
    const before = structuredClone(rows);
    const october = budgetBalances(rows).find(row => row.id === '2026-10')!;
    expect(october).toMatchObject({ available, remaining, alert });
    const highlights = planningHighlights(rows, [], '2026-10-10');
    expect(highlights.alerts.some(row => row.id === october.id)).toBe(reached);
    if (reached) expect(highlights.alerts[0].available).toBe(october.available);
    expect(highlights.unknown).toBe(false);
    expect(rows).toEqual(before);
  });

  it('propagates unknown historical spending through rollover and resets only on opt out or a gap', () => {
    const rows = [budget('2026-09'), budget('2026-10', '750.00')];
    expect(budgetBalances(rows)[1]).toMatchObject({ rollover: null, available: null, remaining: null, alert: 'unknown' });
    expect(planningHighlights(rows, [], '2026-10-10')).toMatchObject({ alerts: [], unknown: true });
    expect(budgetBalances([rows[0], { ...rows[1], rollover_enabled: false }])[1]).toMatchObject({ available: '800.00', remaining: '50.00', alert: 'healthy' });
    expect(budgetBalances([rows[0], budget('2026-11', '750.00')])[1].remaining).toBe('50.00');
  });

  it('keeps rollover isolated across owner, category and native currency with exact large amounts', () => {
    const rows = [budget('2026-09', '700.00'), budget('2026-10', '90071992547409.93', { amount: '90071992547409.92' })];
    expect(budgetBalances(rows)[1].remaining).toBe('99.99');
    expect(planningHighlights(rows, [], '2026-10-10').alerts).toEqual([]);
    for (const extra of [{ user_id: 'other' }, { category_id: 'other' }, { currency: 'USD' as const }]) {
      const isolated = [rows[0], { ...rows[1], ...extra }];
      expect(budgetBalances(isolated)[1].remaining).toBe('-0.01');
      expect(planningHighlights(isolated, [], '2026-10-10').alerts).toHaveLength(1);
    }
  });

  it('uses ordinary reported expense for rollover without expensing principal, transfers or earmarks', () => {
    const accounts: LedgerAccount[] = [
      { id: 'cash', code: 'cash', classification: 'asset', currency: 'MYR' },
      { id: 'savings', code: 'savings', classification: 'asset', currency: 'MYR' },
      { id: 'food', code: 'food', classification: 'expense', currency: 'MYR' },
      { id: 'loan', code: 'loan', classification: 'liability', currency: 'MYR' },
      { id: 'interest', code: 'interest', classification: 'expense', currency: 'MYR' },
    ];
    const actions: Parameters<typeof buildPosting>[1][] = [
      { kind: 'expense', cash: 'cash', expense: 'food', amount: '700.00' },
      { kind: 'transfer', source: 'cash', destination: 'savings', amount: '500.00' },
      { kind: 'loan_payment', cash: 'cash', liability: 'loan', interestExpense: 'interest', principal: '480.00', interest: '120.00' },
      { kind: 'goal_earmark', goal_id: 'goal', amount: '250.00' },
    ];
    const lines: LedgerReadLine[] = actions.flatMap((action, index) => {
      const posting = buildPosting({ request_key: `synthetic:${index}`, currency: 'MYR', occurred_at: '2026-09-20T00:00:00.000099Z' }, action);
      return (posting.lines ?? []).map(line => ({ ...line, event_id: `${index}`, currency: posting.currency, financial_date: '2026-09-20', classification: accounts.find(a => a.id === line.account_id)!.classification }));
    });
    expect(accountingReport(accounts, lines, 'MYR', '2026-09-01', '2026-09-30')).toMatchObject({ expenses: '820.00', equationDifference: '0.00' });
    const ordinaryFood = accountingReport(accounts, lines.filter(line => line.account_id === 'food'), 'MYR', '2026-09-01', '2026-09-30').expenses;
    expect(ordinaryFood).toBe('700.00');
    expect(budgetBalances([budget('2026-09', ordinaryFood), budget('2026-10', '850.00')])[1].remaining).toBe('50.00');
  });
});

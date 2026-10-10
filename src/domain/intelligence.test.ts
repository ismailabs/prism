import { describe, expect, it } from 'vitest';
import { buildIntelligence, futureDates, validateDailyTotal, type IntelligenceInput } from './intelligence';
import { resolveFinancialPeriod } from './periods';
import type { MonthlyTotal } from '@/types';
const now = Date.parse('2026-10-19T04:00Z');
export const fixture = (): IntelligenceInput => ({ userId: 'u', now, timezone: 'Asia/Kuala_Lumpur',
  period: resolveFinancialPeriod({ type: 'month', month: '2026-10' }, 'Asia/Kuala_Lumpur', new Date(now)),
  totals: [], accounts: [], debts: [], repayments: [], goals: [], contributions: [], transfers: [], rules: [], budgets: [], goalPlans: [], debtPlans: [], categories: [] });
const total = (type: 'income' | 'expense', amount: string, date = '2026-10-01', currency: MonthlyTotal['currency'] = 'MYR', category_id: string | null = null): MonthlyTotal => ({ user_id: 'u', financial_date: date, month: date.slice(0, 7), currency, amount, type, category_id, transaction_count: 1 });
const account = (currency: MonthlyTotal['currency'] = 'MYR', balance = '2000.00') => ({ id: 'a', user_id: 'u', name: 'Synthetic account', currency, opening_balance: '0', balance, archived: false, created_at: '' });
const rule = () => ({ id: 'r', user_id: 'u', description: 'Planned rent', amount: '700.00', currency: 'MYR' as const, type: 'expense' as const, account_id: 'a', category_id: null, payment_method_id: null, start_date: '2026-10-26', end_date: null, frequency: 'monthly' as const, interval: 1, next_index: 0, active: true, created_at: '' });
describe('native intelligence authority and scenarios', () => {
  it('keeps salary, ordinary expense, transfer evidence and principal distinct', () => {
    const f = fixture(); f.totals = [total('income', '5000.00'), total('expense', '3000.00')];
    f.accounts = [account('MYR', '1500.00'), { ...account('MYR', '1000.00'), id: 's' }];
    f.debts = [{ id: 'd', user_id: 'u', direction: 'i_owe', counterparty: 'Loan', original_amount: '2000.00', currency: 'MYR', due_date: null, notes: '', created_at: '', updated_at: '' }];
    f.repayments = [{ id: 'p', user_id: 'u', debt_id: 'd', currency: 'MYR', amount: '500.00', effective_amount: '500.00', transaction_id: null, paid_at: '2026-10-10T00:00Z', note: '', created_at: '' }];
    expect(buildIntelligence(f).native[0]).toMatchObject({ income: '5000.00', expense: '3000.00', surplus: '2000.00', surplusRate: 40, balance: '2500.00', debt: '1500.00', recordedRepayments: '500.00' });
    expect(buildIntelligence(f).native[0]).not.toHaveProperty('netWorth');
  });
  it('does not use opening balances or recent transactions as a missing exact balance', () => {
    const f = fixture(); f.accounts = [{ ...account(), balance: undefined }];
    expect(buildIntelligence(f).native[0]).toMatchObject({ income: '0.00', balance: null, recurringScenario: null, surplusRate: null });
    f.accounts = []; expect(buildIntelligence(f).native).toEqual([]);
  });
  it('preserves fractions above IEEE-754 limits and currency boundaries', () => {
    const f = fixture(); f.totals = [total('income', '90071992547409.93'), total('income', '0.10'), total('expense', '0.20'), total('income', '100', '2026-10-01', 'JPY')];
    const data = buildIntelligence(f).native;
    expect(data.find(n => n.currency === 'MYR')).toMatchObject({ income: '90071992547410.03', surplus: '90071992547409.83' });
    expect(data.find(n => n.currency === 'JPY')).toMatchObject({ income: '100', expense: '0', surplus: '100' });
    expect(() => validateDailyTotal({ ...f.totals[0], amount: 0.1 as unknown as string }, 'u')).toThrow('exact financial report');
  });
  it('distinguishes a negative refund aggregate and undefined zero baseline', () => {
    const f = fixture(); f.totals = [total('expense', '-20.00')];
    expect(buildIntelligence(f).native[0]).toMatchObject({ expense: '-20.00', surplus: '20.00', surplusRate: null, expenseChangePercent: null });
    f.totals = [total('expense', '20.00')]; expect(buildIntelligence(f).variances[0]).toMatchObject({ newActivity: true, unusual: false });
  });
  it('forecasts planned rent next week without inventing historical expense', () => {
    const f = fixture(); f.accounts = [account()]; f.rules = [rule()];
    const data = buildIntelligence(f);
    expect(data.native[0]).toMatchObject({ expense: '0.00', balance: '2000.00', recurringChange: '-700.00', recurringScenario: '1300.00' });
    expect(data.upcoming[0]).toMatchObject({ date: '2026-10-26', kind: 'recurring', amount: '-700.00' });
    f.rules[0].active = false; expect(buildIntelligence(f).native[0].recurringScenario).toBe('2000.00');
  });
  it('excludes overdue/today occurrences, preserves anchors, and rejects excessive backlog', () => {
    expect(futureDates({ start: '2024-01-31', frequency: 'monthly', interval: 1 }, 0, '2024-02-29', '2024-03-31')).toEqual({ dates: ['2024-03-31'], overdue: 2 });
    expect(() => futureDates({ start: '1900-01-01', frequency: 'daily', interval: 1 }, 0, '2026-10-19', '2026-11-18')).toThrow('backlog');
    expect(futureDates({ start: '2026-10-19', frequency: 'daily', interval: 1, end: '2026-10-20' }, 0, '2026-10-19', '2026-11-18')).toEqual({ dates: ['2026-10-20'], overdue: 1 });
  });
  it('matches the RM800 / RM610 / 12 days example and explicit sensitivity arithmetic', () => {
    const f = fixture(); f.budgets = [{ id: 'b', user_id: 'u', category_id: 'food', currency: 'MYR', month: '2026-10-01', amount: '800.00', spent: '610.00', created_at: '' }];
    expect(buildIntelligence(f).budgets[0]).toMatchObject({ remaining: '190.00', remainingDays: 12, projected: '995.26', low: '918.21', high: '1072.31', risk: true });
    f.now = Date.parse('2026-10-31T04:00Z');
    expect(buildIntelligence(f).budgets[0]).toMatchObject({ projected: '610.00', low: '610.00', high: '610.00' });
    f.budgets[0].spent = undefined;
    expect(buildIntelligence(f).budgets[0]).toMatchObject({ remaining: null, projected: null, risk: false });
  });
  it('restates corrections and keeps partial comparisons from an unusual-spending claim', () => {
    const f = fixture(); f.totals = [total('expense', '100.00'), total('expense', '20.00', '2026-09-01')];
    expect(buildIntelligence(f).variances[0].unusual).toBe(false);
    f.period.partial = false; expect(buildIntelligence(f).variances[0].unusual).toBe(true);
    f.totals[0].amount = '10.00'; expect(buildIntelligence(f).native[0].expenseChange).toBe('-10.00');
  });
  it('marks missing effective linked repayments unavailable instead of zero', () => {
    const f = fixture(); f.debts = [{ id: 'd', user_id: 'u', direction: 'i_owe', counterparty: 'Loan', original_amount: '20.00', currency: 'MYR', due_date: '2026-10-25', notes: '', created_at: '', updated_at: '' }];
    f.repayments = [{ id: 'p', user_id: 'u', debt_id: 'd', currency: 'MYR', amount: null, transaction_id: 'missing', paid_at: '2026-10-01T00:00Z', note: '', created_at: '' }];
    expect(buildIntelligence(f).native[0]).toMatchObject({ debt: null, recordedRepayments: null });
    expect(buildIntelligence(f).upcoming[0].amount).toBeNull();
  });
  it('keeps own goal cadence and debt-plan assumptions separate from recurring cash', () => {
    const f = fixture(); f.accounts = [account()]; f.rules = [rule()];
    f.goals = [{ id: 'g', user_id: 'u', kind: 'goal', name: 'Goal', notes: '', category: '', priority: 'normal', target_amount: '50.00', currency: 'MYR', target_date: '2026-11-01', status: 'active', created_at: '', updated_at: '' }];
    f.goalPlans = [{ id: 'p', user_id: 'u', objective_id: 'g', account_id: 'a', currency: 'MYR', cadence_amount: '100.00', frequency: 'weekly', start_date: '2026-10-20', created_at: '' }];
    expect(buildIntelligence(f).upcoming.find(o => o.kind === 'goal-plan')).toMatchObject({ amount: '50.00' });
    expect(buildIntelligence(f).native[0].recurringScenario).toBe('1300.00');
    f.goals[0].status = 'paused'; expect(buildIntelligence(f).upcoming.some(o => o.kind === 'goal-plan')).toBe(false);
  });
  it('uses financial timezone at year/month cutovers and preserves inputs', () => {
    const f = fixture(); f.now = Date.parse('2026-12-31T16:00:00Z'); f.accounts = [account()];
    const before = structuredClone(f); expect(buildIntelligence(f).today).toBe('2027-01-01'); expect(f).toEqual(before);
    f.accounts[0].user_id = 'foreign'; expect(() => buildIntelligence(f)).toThrow('owner mismatch');
  });
  it('does not invent a debt payoff date from an unsplit minimum payment', () => {
    const f = fixture(); f.debts = [{ id: 'd', user_id: 'u', direction: 'i_owe', counterparty: 'Loan', original_amount: '20.00', currency: 'MYR', due_date: null, notes: '', created_at: '', updated_at: '' }];
    f.debtPlans = [{ id: 'p', user_id: 'u', debt_id: 'd', currency: 'MYR', debt_type: 'credit_card', scenario_principal: '20.00', balance_as_of: '2026-10-01', apr_bps: null, rate_mode: 'manual', minimum_payment: '50.00', frequency: 'weekly', first_payment_date: '2026-10-20', custom_rank: 0, created_at: '' }];
    expect(buildIntelligence(f).upcoming.filter(o => o.kind === 'debt-plan')).toHaveLength(5);
    f.debtPlans[0].balance_as_of = '2026-11-01';
    expect(buildIntelligence(f).upcoming.filter(o => o.kind === 'debt-plan')).toHaveLength(0);
  });
  it('excludes unmapped cash assumptions and does not invent a baseline for all-time review', () => {
    const f = fixture(); f.accounts = [account()]; f.rules = [{ ...rule(), account_id: null }];
    expect(buildIntelligence(f).native[0]).toMatchObject({ recurringChange: '0.00', recurringScenario: '2000.00', unassignedRules: 1 });
    expect(buildIntelligence(f).upcoming).toHaveLength(1);
    f.totals = [total('expense', '20.00')]; f.period.comparison = false;
    expect(buildIntelligence(f).variances[0]).toMatchObject({ newActivity: false, unusual: false });
  });
});

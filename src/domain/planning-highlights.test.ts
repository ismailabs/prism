import { describe, expect, it } from 'vitest';
import { planningHighlights } from './planning-highlights';
import type { MonthlyBudget, RecurringRule } from '@/types';
const budget = (id: string, values: Partial<MonthlyBudget> = {}): MonthlyBudget => ({ id, user_id: 'synthetic', category_id: 'food', currency: 'MYR', month: '2026-10-01', amount: '100.00', spent: '100.00', created_at: '', ...values });
const rule = (id: string, values: Partial<RecurringRule> = {}): RecurringRule => ({ id, user_id: 'synthetic', description: id, amount: '25.00', currency: 'MYR', type: 'expense', account_id: null, category_id: null, payment_method_id: null, start_date: '2026-01-31', end_date: null, frequency: 'monthly', interval: 1, next_index: 2, active: true, created_at: '', ...values });
describe('planning highlights', () => {
  it('detects a native cent beyond the safe-number boundary without mixing currencies', () => {
    const result = planningHighlights([budget('exact', { amount: '90071992547409.92', spent: '90071992547409.93' }), budget('usd', { currency: 'USD', spent: '99.99' })], [], '2026-10-10');
    expect(result.alerts.map(item => item.id)).toEqual(['exact']);
  });
  it('keeps unknown spending unknown and excludes other months', () => {
    const result = planningHighlights([budget('unknown', { spent: undefined }), budget('zero', { amount: '0.00', spent: '0.00' }), budget('prior', { month: '2026-09-01', spent: '200.00' })], [], '2026-10-10');
    expect(result.alerts).toEqual([]);
    expect(result.unknown).toBe(true);
  });
  it('preserves anchored recurrence and omits inactive and finished rules', () => {
    const result = planningHighlights([], [rule('inactive', { active: false }), rule('ended', { end_date: '2026-02-28' }), rule('next')], '2026-02-10');
    expect(result.next?.date).toBe('2026-03-31');
    expect(result.next?.rule.id).toBe('next');
  });
});

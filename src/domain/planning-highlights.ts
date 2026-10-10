import { parseMoney, parseMoneyTotal } from './money.ts';
import { occurrenceDate } from './recurrence.ts';
import { budgetBalances } from './planning.ts';
import type { MonthlyBudget, RecurringRule } from '@/types';

export function planningHighlights(budgets: MonthlyBudget[], rules: RecurringRule[], today: string) {
  const current = budgetBalances(budgets).filter(budget => budget.month.startsWith(today.slice(0, 7)));
  const alerts = current.filter(budget => budget.alert !== 'unknown' && budget.available !== null && budget.spent !== undefined && parseMoney(budget.amount, budget.currency) > 0n && parseMoneyTotal(budget.spent, budget.currency) >= parseMoneyTotal(budget.available, budget.currency));
  const next = rules.filter(rule => rule.active).map(rule => ({
    rule,
    date: occurrenceDate({ start: rule.start_date, end: rule.end_date, frequency: rule.frequency, interval: rule.interval }, rule.next_index),
  })).filter((item): item is { rule: RecurringRule; date: string } => item.date !== null).sort((a, b) => a.date.localeCompare(b.date) || a.rule.id.localeCompare(b.rule.id))[0];
  return { alerts, next, unknown: current.some(budget => budget.alert === 'unknown') };
}

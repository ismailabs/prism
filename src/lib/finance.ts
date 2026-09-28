import { convertCurrency } from '@/services/currency';
import type { Category, Currency, ExchangeRates, Transaction } from '@/types';

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  monthlyIncome: number;
  monthlyExpense: number;
  dailySpending: number;
  projectedMonthlyExpense: number;
  previousMonthlyExpense: number;
  spendingChangePercent: number | null;
}

export interface MonthlyCashFlow { key: string; month: string; income: number; expense: number }
export interface CategoryBreakdown { id: string; name: string; color: string; value: number }

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function summarizeTransactions(transactions: Transaction[], currency: Currency, rates: ExchangeRates | null, now = new Date()): FinanceSummary {
  const currentMonth = monthKey(now);
  const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  let income = 0;
  let expense = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  let previousMonthlyExpense = 0;
  for (const transaction of transactions) {
    const date = new Date(transaction.transaction_date);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const amount = convertCurrency(transaction.amount, transaction.currency, currency, rates);
    const month = monthKey(date);
    if (transaction.type === 'income') {
      income += amount;
      if (month === currentMonth) monthlyIncome += amount;
    } else {
      expense += amount;
      if (month === currentMonth) monthlyExpense += amount;
      if (month === previousMonth) previousMonthlyExpense += amount;
    }
  }
  const dailySpending = monthlyExpense / now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    income, expense, balance: income - expense,
    savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0,
    monthlyIncome, monthlyExpense, dailySpending,
    projectedMonthlyExpense: dailySpending * daysInMonth,
    previousMonthlyExpense,
    spendingChangePercent: previousMonthlyExpense > 0 ? ((monthlyExpense - previousMonthlyExpense) / previousMonthlyExpense) * 100 : null,
  };
}

export function getMonthlyCashFlow(transactions: Transaction[], currency: Currency, rates: ExchangeRates | null, months = 6, now = new Date(), locale = 'en'): MonthlyCashFlow[] {
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new Error('Month count must be between 1 and 120.');
  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - months + index + 1, 1);
    return { key: monthKey(date), month: date.toLocaleDateString(locale === 'ms' ? 'ms-MY' : 'en-US', { month: 'short' }), income: 0, expense: 0 };
  });
  const byMonth = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const transaction of transactions) {
    const date = new Date(transaction.transaction_date);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const bucket = byMonth.get(monthKey(date));
    if (bucket) bucket[transaction.type] += convertCurrency(transaction.amount, transaction.currency, currency, rates);
  }
  return buckets;
}

export function getCategoryBreakdown(transactions: Transaction[], categories: Category[], currency: Currency, rates: ExchangeRates | null, month = new Date()): CategoryBreakdown[] {
  const lookup = new Map(categories.map((category) => [category.id, category]));
  const buckets = new Map<string, CategoryBreakdown>();
  for (const transaction of transactions) {
    const date = new Date(transaction.transaction_date);
    if (transaction.type !== 'expense' || !Number.isFinite(date.getTime()) || monthKey(date) !== monthKey(month) || date > month) continue;
    const category = transaction.category_id ? lookup.get(transaction.category_id) : undefined;
    const id = category?.id ?? 'uncategorized';
    const bucket = buckets.get(id) ?? { id, name: category?.name ?? 'Uncategorized', color: category?.color ?? '#94a3b8', value: 0 };
    bucket.value += convertCurrency(transaction.amount, transaction.currency, currency, rates);
    buckets.set(id, bucket);
  }
  return [...buckets.values()].sort((left, right) => right.value - left.value);
}

export interface OptimisticOperation<T> { token: string; apply: (rows: T[]) => T[] }

/** Replays queued edits over confirmed data so a failed earlier write cannot erase a later edit. */
export class OptimisticLedger<T> {
  private confirmed: T[];
  private pending: OptimisticOperation<T>[] = [];
  constructor(rows: T[]) { this.confirmed = rows; }
  add(operation: OptimisticOperation<T>): T[] { this.pending.push(operation); return this.value(); }
  settle(token: string, commit?: (rows: T[]) => T[]): T[] {
    if (commit) this.confirmed = commit(this.confirmed);
    this.pending = this.pending.filter((operation) => operation.token !== token);
    return this.value();
  }
  value(): T[] { return this.pending.reduce((rows, operation) => operation.apply(rows), this.confirmed); }
  get pendingCount(): number { return this.pending.length; }
}

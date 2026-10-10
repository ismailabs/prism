import type { Account, Category, Currency, DebtRepayment, MonthlyBudget, MonthlyTotal, Objective, ObjectiveContribution, PersonDebt, RecurringRule, Transfer } from '../types/index.ts';
import type { GoalActionPlan } from '../types/actions.ts';
import type { DebtPlan } from './planning.ts';
import { budgetBalances } from './planning.ts';
import { goalFunding, goalProjection } from './goal-actions.ts';
import { financialDate, hasOccurred } from './dates.ts';
import { calendarDays, monthEnd, periodIncludes, shiftDay, validCalendarDate, type Period } from './periods.ts';
import { decimalMoney, parseMoneyTotal } from './money.ts';
import { occurrenceDate, type RecurrenceRule } from './recurrence.ts';

export interface IntelligenceInput {
  userId: string; now: number; timezone: string; period: Period; totals: MonthlyTotal[];
  accounts: Account[]; debts: PersonDebt[]; repayments: DebtRepayment[];
  goals: Objective[]; contributions: ObjectiveContribution[]; transfers: Transfer[];
  rules: RecurringRule[]; budgets: MonthlyBudget[]; goalPlans: GoalActionPlan[]; debtPlans: DebtPlan[];
  categories: Category[];
}
export function validateDailyTotal(row: MonthlyTotal, owner: string): MonthlyTotal {
  if (row.user_id !== owner || !['MYR', 'USD', 'EUR', 'JPY'].includes(row.currency) ||
      !['income', 'expense'].includes(row.type) || typeof row.amount !== 'string' ||
      !row.financial_date || !validCalendarDate(row.financial_date) || row.month !== row.financial_date.slice(0, 7) ||
      !Number.isSafeInteger(row.transaction_count) || row.transaction_count < 0)
    throw new Error('Invalid exact financial report.');
  parseMoneyTotal(row.amount, row.currency);
  return row;
}
const round = (n: bigint, d: bigint) => {
  if (d <= 0n) throw new Error('Invalid denominator.');
  return n < 0n ? -((-n + d / 2n) / d) : (n + d / 2n) / d;
};
const sum = (rows: { currency: Currency; amount: string }[], currency: Currency) =>
  rows.filter(r => r.currency === currency).reduce((n, r) => n + parseMoneyTotal(r.amount, currency), 0n);

/** Bounded anchored dates, not elapsed milliseconds; excludes already recorded indexes. */
export function futureDates(rule: RecurrenceRule, next: number, today: string, through: string, limit = 10000) {
  const dates: string[] = [];
  let overdue = 0;
  for (let step = 0; step <= limit; step++) {
    if (step === limit) throw new Error('Recurring backlog exceeds the supported forecast range. Review the source plan.');
    const date = occurrenceDate(rule, next + step);
    if (!date || date > through) return { dates, overdue };
    if (date > today) dates.push(date); else overdue++;
  }
  return { dates, overdue };
}

export function buildIntelligence(input: IntelligenceInput) {
  const { now, timezone, period } = input;
  if (!Number.isSafeInteger(now)) throw new Error('Invalid observation time.');
  for (const rows of [input.totals, input.accounts, input.debts, input.repayments, input.goals,
    input.contributions, input.transfers, input.rules, input.budgets, input.goalPlans, input.debtPlans, input.categories])
    if (rows.some(r => r.user_id !== input.userId)) throw new Error('Financial source owner mismatch.');
  input.totals.forEach(row => validateDailyTotal(row, input.userId));
  const today = financialDate(new Date(now), timezone), through = shiftDay(today, 30);
  const selected = input.totals.filter(r => periodIncludes(r.financial_date!, period));
  const previous = input.totals.filter(r => periodIncludes(r.financial_date!, period, true));
  const currencies = [...new Set<Currency>([...input.totals, ...input.accounts, ...input.debts,
    ...input.goals, ...input.rules, ...input.budgets].map(r => r.currency))].sort();
  const repaymentAmount = (r: DebtRepayment) => r.effective_amount ?? (r.transaction_id ? null : r.amount);
  const balanceOfDebt = (d: PersonDebt) => {
    const rows = input.repayments.filter(r => r.debt_id === d.id && r.currency === d.currency && hasOccurred(r.paid_at, now));
    if (rows.some(r => repaymentAmount(r) === null)) return null;
    const paid = rows.reduce((n, r) => n + parseMoneyTotal(repaymentAmount(r)!, d.currency), 0n);
    const remaining = parseMoneyTotal(d.original_amount, d.currency) - paid;
    return remaining > 0n ? remaining : 0n;
  };
  const obligations = input.debts.map(debt => ({ debt, remaining: balanceOfDebt(debt) }));
  const upcoming: { id: string; name: string; date: string; amount: string | null; currency: Currency; kind: 'recurring' | 'debt-plan' | 'debt-due' | 'goal-plan'; accountId: string | null }[] = [];
  let overdueRules = 0;
  for (const rule of input.rules.filter(r => r.active)) {
    const result = futureDates({ start: rule.start_date, end: rule.end_date, frequency: rule.frequency, interval: rule.interval }, rule.next_index, today, through);
    overdueRules += result.overdue;
    for (const date of result.dates) upcoming.push({ id: `rule/${rule.id}/${date}`, name: rule.description, date,
      amount: decimalMoney((rule.type === 'income' ? 1n : -1n) * parseMoneyTotal(rule.amount, rule.currency), rule.currency),
      currency: rule.currency, kind: 'recurring', accountId: rule.account_id });
  }
  for (const { debt, remaining } of obligations) {
    if (debt.direction !== 'i_owe' || remaining === 0n) continue;
    if (debt.due_date && debt.due_date <= through) upcoming.push({ id: `due/${debt.id}`, name: debt.counterparty, date: debt.due_date,
      amount: remaining === null ? null : decimalMoney(remaining, debt.currency), currency: debt.currency, kind: 'debt-due', accountId: null });
    const plan = input.debtPlans.find(p => p.debt_id === debt.id && p.currency === debt.currency);
    if (!plan || plan.minimum_payment === null || remaining === null || plan.balance_as_of > today) continue;
    for (const date of futureDates({ start: plan.first_payment_date, frequency: plan.frequency === 'monthly' ? 'monthly' : 'weekly', interval: plan.frequency === 'biweekly' ? 2 : 1 }, 0, today, through).dates) {
      const payment = parseMoneyTotal(plan.minimum_payment, debt.currency);
      if (payment <= 0n) break;
      // This is a payment assumption, not an amortization/principal calculation.
      upcoming.push({ id: `debt-plan/${plan.id}/${date}`, name: debt.counterparty, date, amount: decimalMoney(payment, debt.currency), currency: debt.currency, kind: 'debt-plan', accountId: null });
    }
  }
  const goalPace = input.goals.filter(g => g.status === 'active').map(goal => {
    const funding = goalFunding(goal, input.contributions, [], input.transfers, now);
    const plan = input.goalPlans.find(p => p.objective_id === goal.id && p.currency === goal.currency);
    const estimatedDate = plan ? goalProjection(funding.remaining, plan, shiftDay(today, 1)) : null;
    if (plan && !funding.completed) {
      let left = parseMoneyTotal(funding.remaining, goal.currency);
      for (const date of futureDates({ start: plan.start_date, frequency: plan.frequency, interval: 1 }, 0, today, through, 1200).dates) {
        const amount = parseMoneyTotal(plan.cadence_amount, goal.currency);
        if (amount <= 0n || left <= 0n) break;
        const next = left < amount ? left : amount;
        upcoming.push({ id: `goal-plan/${plan.id}/${date}`, name: goal.name, date, amount: decimalMoney(next, goal.currency), currency: goal.currency, kind: 'goal-plan', accountId: plan.account_id });
        left -= next;
      }
    }
    return { goal, funding, plan, estimatedDate, behind: !funding.completed && !!goal.target_date && (!estimatedDate || estimatedDate > goal.target_date) };
  });
  const native = currencies.map(currency => {
    const text = (n: bigint) => decimalMoney(n, currency);
    const income = sum(selected.filter(r => r.type === 'income'), currency), expense = sum(selected.filter(r => r.type === 'expense'), currency);
    const priorExpense = sum(previous.filter(r => r.type === 'expense'), currency);
    const accounts = input.accounts.filter(a => a.currency === currency);
    const balance = accounts.length && accounts.every(a => typeof a.balance === 'string')
      ? accounts.reduce((n, a) => n + parseMoneyTotal(a.balance!, currency), 0n) : null;
    const debtTotal = (direction: PersonDebt['direction']) => {
      const rows = obligations.filter(o => o.debt.currency === currency && o.debt.direction === direction);
      return rows.some(o => o.remaining === null) ? null : text(rows.reduce((n, o) => n + o.remaining!, 0n));
    };
    const recurring = upcoming.filter(o => o.kind === 'recurring' && o.currency === currency);
    const mapped = recurring.filter(o => input.accounts.some(a => a.id === o.accountId && a.currency === currency));
    const planned = mapped.reduce((n, o) => n + parseMoneyTotal(o.amount!, currency), 0n);
    const reviewContributions = input.contributions.filter(r => hasOccurred(r.contributed_at, now) && periodIncludes(financialDate(r.contributed_at, timezone), period));
    const evidence = input.goals.filter(g => g.currency === currency).map(g => goalFunding(g, reviewContributions, [], input.transfers, now));
    const contribution = (field: 'transferred' | 'earmarked' | 'legacy') => text(evidence.reduce((n, g) => n + parseMoneyTotal(g[field], currency), 0n));
    const paid = input.repayments.filter(r => r.currency === currency && hasOccurred(r.paid_at, now) && periodIncludes(financialDate(r.paid_at, timezone), period) && input.debts.some(d => d.id === r.debt_id && d.direction === 'i_owe'));
    const payment = paid.some(r => repaymentAmount(r) === null) ? null : text(paid.reduce((n, r) => n + parseMoneyTotal(repaymentAmount(r)!, currency), 0n));
    return { currency, income: text(income), expense: text(expense), surplus: text(income - expense),
      surplusRate: income > 0n ? Number(round((income - expense) * 1000n, income)) / 10 : null,
      expenseChange: text(expense - priorExpense), expenseChangePercent: priorExpense > 0n ? Number(round((expense - priorExpense) * 1000n, priorExpense)) / 10 : null,
      accounts: accounts.length, balance: balance === null ? null : text(balance), debt: debtTotal('i_owe'), receivables: debtTotal('owed_to_me'),
      recurringChange: text(planned), recurringScenario: balance === null ? null : text(balance + planned),
      unassignedRules: recurring.length - mapped.length,
      transferred: contribution('transferred'), earmarked: contribution('earmarked'), legacyFunding: contribution('legacy'), recordedRepayments: payment };
  });
  const elapsedDays = Number(today.slice(8)), totalDays = Number(monthEnd(today.slice(0, 7)).slice(8));
  const budgets = budgetBalances(input.budgets).filter(b => b.month.startsWith(today.slice(0, 7))).map(b => {
    const observed = b.spent === undefined ? null : parseMoneyTotal(b.spent, b.currency);
    const future = observed === null ? null : round(observed * BigInt(totalDays - elapsedDays), BigInt(elapsedDays));
    const projected = observed === null || future === null ? null : observed + future;
    return { ...b, elapsedDays, totalDays, remainingDays: totalDays - elapsedDays,
      projected: projected === null ? null : decimalMoney(projected, b.currency),
      low: observed === null || future === null ? null : decimalMoney(observed + round(future * 80n, 100n), b.currency),
      high: observed === null || future === null ? null : decimalMoney(observed + round(future * 120n, 100n), b.currency),
      risk: projected !== null && b.available !== null && projected > parseMoneyTotal(b.available, b.currency) };
  });
  const variances = [...new Set(selected.filter(r => r.type === 'expense').map(r => `${r.currency}/${r.category_id ?? ''}`))].map(key => {
    const [currency, category] = key.split('/') as [Currency, string];
    const current = sum(selected.filter(r => r.type === 'expense' && (r.category_id ?? '') === category), currency);
    const prior = sum(previous.filter(r => r.type === 'expense' && (r.category_id ?? '') === category), currency);
    return { currency, categoryId: category || null, current: decimalMoney(current, currency), prior: decimalMoney(prior, currency),
      newActivity: period.comparison !== false && prior === 0n && current > 0n, unusual: period.comparison !== false && !period.partial && prior > 0n && current * 100n >= prior * 150n };
  });
  return { today, through, native, upcoming: upcoming.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
    overdueRules, budgets, goalPace, variances, baselineDays: period.from && period.to ? calendarDays(period.from, period.to) : null };
}

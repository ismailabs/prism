import { convertCurrency } from "@/services/currency";
import type {
  Category,
  Currency,
  ExchangeRates,
  MonthlyTotal,
  Transaction,
} from "@/types";
import { financialDate } from "./dates";
import { decimalMoney, parseMoneyTotal } from "./money";
import { categoryColor, ratio } from './analytics';
import { analyticsPeriod, calendarDays, periodIncludes, periodMonths, type Period } from './periods';
export interface FinancialReport {
  monthly: MonthlyTotal[];
  net: { user_id: string; currency: Currency; amount: string }[];
}
export function dashboardFinancials(
  transactions: Transaction[],
  categories: Category[],
  month: string | Period,
  currency: Currency,
  rates: ExchangeRates | null,
  timezone: string,
  locale: string,
  uncategorized: string,
  report?: FinancialReport,
) {
  const now = new Date();
  const today = financialDate(now, timezone);
  const period = typeof month === 'string' ? analyticsPeriod(month, 1) : month;
  const days = period.from && period.to ? calendarDays(period.from, period.to) : 0;
  const dayCount = period.from && period.to && period.from <= today ? calendarDays(period.from, period.to < today ? period.to : today) : 0;
  const ordinary = transactions.filter(
    (tx) =>
      (!tx.activity_kind || tx.activity_kind === "ordinary") &&
      new Date(tx.transaction_date) <= now,
  );
  const rows =
    report?.monthly ??
    ordinary.map((tx) => ({
      user_id: tx.user_id,
      financial_date: tx.financial_date ?? financialDate(tx.transaction_date, timezone),
      month: (
        tx.financial_date ?? financialDate(tx.transaction_date, timezone)
      ).slice(0, 7),
      currency: tx.currency,
      type: tx.type,
      category_id: tx.category_id,
      amount: tx.amount,
      transaction_count: 1,
    }));
  const totals = (values: { currency: Currency; amount: string }[]) => {
    const native = new Map<Currency, bigint>();
    for (const v of values)
      native.set(
        v.currency,
        (native.get(v.currency) ?? 0n) + parseMoneyTotal(v.amount, v.currency),
      );
    if ([...native.keys()].every((c) => c === currency))
      return decimalMoney(native.get(currency) ?? 0n, currency);
    return [...native].reduce(
      (sum, [from, minor]) =>
        sum + convertCurrency(decimalMoney(minor, from), from, currency, rates),
      0,
    );
  };
  let unavailable = false;
  const safe = (values: { currency: Currency; amount: string }[]) => {
    try {
      return totals(values);
    } catch {
      unavailable = true;
      return "0";
    }
  };
  const selected = rows.filter((r) => periodIncludes(r.financial_date ?? r.month + '-01', period));
  const incomeExact = safe(selected.filter((r) => r.type === "income"));
  const expenseExact = safe(selected.filter((r) => r.type === "expense"));
  const net =
    report?.net ??
    ordinary.map((tx) => ({
      currency: tx.currency,
      amount: decimalMoney(
        (tx.type === "income" ? 1n : -1n) * parseMoneyTotal(tx.amount, tx.currency),
        tx.currency,
      ),
    }));
  const balanceExact = safe(net);
  const chart = periodMonths(period, rows.map(r => r.financial_date ?? r.month + '-01')).map(key => {
    const date = new Date(key + '-01T12:00:00Z');
    return {
      incomeExact: safe(selected.filter((r) => r.month === key && r.type === "income")),
      expenseExact: safe(selected.filter((r) => r.month === key && r.type === "expense")),
      from: period.from > key + '-01' ? period.from : key + '-01',
      to: period.to,
      key,
      name: date.toLocaleDateString(locale === "ms" ? "ms-MY" : "en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      income: Number(
        safe(selected.filter((r) => r.month === key && r.type === "income")),
      ),
      expense: Number(
        safe(selected.filter((r) => r.month === key && r.type === "expense")),
      ),
    };
  });
  const byCategory = [
    ...new Set(
      selected.filter((r) => r.type === "expense").map((r) => r.category_id),
    ),
  ];
  const breakdown = byCategory
    .map((id) => {
      const c = categories.find((c) => c.id === id);
      const exact = safe(
        selected.filter((r) => r.type === "expense" && r.category_id === id),
      );
      return {
        id,
        count: selected.filter(r => r.type === "expense" && r.category_id === id).reduce((n,r)=>n+r.transaction_count,0),
        name: c?.name ?? uncategorized,
        color: categoryColor(id, categories),
        exact,
        value: Number(exact),
      };
    })
    .sort((a, b) => {
      if(typeof a.exact==='string'&&typeof b.exact==='string'){
        const left=parseMoneyTotal(a.exact,currency),right=parseMoneyTotal(b.exact,currency);
        return left>right?-1:left<right?1:0;
      }
      return b.value-a.value;
    });
  const income = Number(incomeExact),
    expense = Number(expenseExact);
  const netExact =
    typeof incomeExact === "string" && typeof expenseExact === "string"
      ? decimalMoney(
          parseMoneyTotal(incomeExact, currency) -
            parseMoneyTotal(expenseExact, currency),
          currency,
        )
      : income - expense;
  const positiveFlow =
    typeof netExact === "string"
      ? parseMoneyTotal(netExact, currency) >= 0n
      : netExact >= 0;
  const netMagnitude =
    typeof netExact === "string"
      ? decimalMoney(
          positiveFlow
            ? parseMoneyTotal(netExact, currency)
            : -parseMoneyTotal(netExact, currency),
          currency,
        )
      : Math.abs(netExact);
  return {
    income,
    expense,
    balance: Number(balanceExact),
    incomeExact,
    expenseExact,
    balanceExact,
    netMagnitude,
    positiveFlow,
    chart,
    breakdown,
    unavailable,
    mixed: [...rows, ...net].some((r) => r.currency !== currency),
    surplusRate: ratio(netExact, incomeExact, currency),
    daily: dayCount ? expense / dayCount : 0,
    forecast: dayCount ? (expense / dayCount) * days : 0,
  };
}

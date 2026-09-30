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
export interface FinancialReport {
  monthly: MonthlyTotal[];
  net: { user_id: string; currency: Currency; amount: string }[];
}
export function dashboardFinancials(
  transactions: Transaction[],
  categories: Category[],
  month: string,
  currency: Currency,
  rates: ExchangeRates | null,
  timezone: string,
  locale: string,
  uncategorized: string,
  report?: FinancialReport,
) {
  const now = new Date();
  const today = financialDate(now, timezone);
  const [year, index] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const dayCount =
    today.slice(0, 7) === month
      ? Number(today.slice(8))
      : month > today.slice(0, 7)
        ? 0
        : days;
  const ordinary = transactions.filter(
    (tx) =>
      (!tx.activity_kind || tx.activity_kind === "ordinary") &&
      new Date(tx.transaction_date) <= now,
  );
  const rows =
    report?.monthly ??
    ordinary.map((tx) => ({
      user_id: tx.user_id,
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
  const selected = rows.filter((r) => r.month === month);
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
  const chart = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(year, index - 6 + i, 1));
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      name: date.toLocaleDateString(locale === "ms" ? "ms-MY" : "en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      income: Number(
        safe(rows.filter((r) => r.month === key && r.type === "income")),
      ),
      expense: Number(
        safe(rows.filter((r) => r.month === key && r.type === "expense")),
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
        name: c?.name ?? uncategorized,
        color: c?.color ?? "#94a3b8",
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
    savingsRate: income ? (Number(netExact) / income) * 100 : 0,
    daily: dayCount ? expense / dayCount : 0,
    forecast: dayCount ? (expense / dayCount) * days : 0,
  };
}

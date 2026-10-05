import { financialDate } from "./dates";
import { decimalMoney, parseMoneyTotal } from "./money";
import { convertCurrency } from "@/services/currency";
import type { Category, Currency, ExchangeRates, MonthlyTotal } from "@/types";
import { periodIncludes, type Period } from './periods';
export { analyticsPeriod, shiftMonth, monthEnd, type Period } from './periods';
export type DisplayAmount = string | number;
export interface CategoryAmount {
  id: string | null;
  ids?: (string | null)[];
  name: string;
  color: string;
  exact: DisplayAmount;
  value: number;
  percent: number;
  count: number;
}
const palette = [
  "#148575",
  "#577fc2",
  "#a271b4",
  "#c38a45",
  "#bb6879",
  "#6c914c",
  "#5b91a1",
  "#928459",
  "#775fab",
  "#438c96",
  "#a46d47",
  "#ab728d",
  "#78834b",
  "#4e78a4",
  "#846ead",
  "#9b7953",
];
export function categoryColor(id: string | null, categories: Category[]) {
  const color = categories.find(category => category.id === id)?.color;
  if (color && /^#[0-9a-f]{6}$/i.test(color)) return color;
  // Presentation fallback depends only on identity, never on neighboring colors.
  let hash = 0;
  for (const c of id ?? 'uncategorized') hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
export function totalAmount(
  rows: { currency: Currency; amount: string }[],
  currency: Currency,
  rates: ExchangeRates | null,
): DisplayAmount {
  const sums = new Map<Currency, bigint>();
  for (const row of rows)
    sums.set(
      row.currency,
      (sums.get(row.currency) ?? 0n) +
        parseMoneyTotal(row.amount, row.currency),
    );
  if ([...sums.keys()].every((c) => c === currency))
    return decimalMoney(sums.get(currency) ?? 0n, currency);
  return [...sums].reduce(
    (sum, [native, value]) =>
      sum +
      convertCurrency(decimalMoney(value, native), native, currency, rates),
    0,
  );
}
export function difference(
  a: DisplayAmount,
  b: DisplayAmount,
  currency: Currency,
): DisplayAmount {
  return typeof a === "string" && typeof b === "string"
    ? decimalMoney(
        parseMoneyTotal(a, currency) - parseMoneyTotal(b, currency),
        currency,
      )
    : Number(a) - Number(b);
}
export function ratio(
  a: DisplayAmount,
  b: DisplayAmount,
  currency: Currency,
): number | null {
  if (typeof a === "string" && typeof b === "string") {
    const denominator = parseMoneyTotal(b, currency);
    if (denominator <= 0n) return null;
    const numerator = parseMoneyTotal(a, currency) * 1000n;
    const magnitude = numerator < 0n ? -numerator : numerator;
    const rounded = (magnitude + denominator / 2n) / denominator;
    return Number(numerator < 0n ? -rounded : rounded) / 10;
  }
  return Number(b) > 0 ? (Number(a) / Number(b)) * 100 : null;
}
export function analyzePeriod(
  rows: MonthlyTotal[],
  categories: Category[],
  period: Period,
  currency: Currency,
  rates: ExchangeRates | null,
  uncategorized: string,
) {
  const selected = rows.filter(
    (r) => periodIncludes(r.financial_date ?? r.month + '-01', period),
  );
  const previous = rows.filter(
    (r) => periodIncludes(r.financial_date ?? r.month + '-01', period, true),
  );
  const sum = (values: MonthlyTotal[], type: string) =>
    totalAmount(
      values.filter((r) => r.type === type),
      currency,
      rates,
    );
  const income = sum(selected, "income"),
    expense = sum(selected, "expense");
  const previousIncome = sum(previous, "income"),
    previousExpense = sum(previous, "expense");
  const net = difference(income, expense, currency),
    previousNet = difference(previousIncome, previousExpense, currency);
  const breakdown = (type: string): CategoryAmount[] =>
    [
      ...new Set(
        selected.filter((r) => r.type === type).map((r) => r.category_id),
      ),
    ]
      .map((id) => {
        const values = selected.filter(
          (r) => r.type === type && r.category_id === id,
        );
        const exact = totalAmount(values, currency, rates);
        return {
          id,
          name: categories.find((c) => c.id === id)?.name ?? uncategorized,
          color: categoryColor(id, categories),
          exact,
          value: Number(exact),
          percent:
            ratio(exact, type === "income" ? income : expense, currency) ?? 0,
          count: values.reduce((n, r) => n + r.transaction_count, 0),
        };
      })
      .sort((a, b) =>
        typeof a.exact === "string" && typeof b.exact === "string"
          ? parseMoneyTotal(a.exact, currency) >
            parseMoneyTotal(b.exact, currency)
            ? -1
            : parseMoneyTotal(a.exact, currency) <
                parseMoneyTotal(b.exact, currency)
              ? 1
              : 0
          : b.value - a.value,
      );
  return {
    income,
    expense,
    net,
    previousIncome,
    previousExpense,
    previousNet,
    savingsRate: ratio(net, income, currency),
    previousSavingsRate: ratio(previousNet, previousIncome, currency),
    spending: breakdown("expense"),
    incomeCategories: breakdown("income"),
    count: selected.reduce((n, r) => n + r.transaction_count, 0),
    previousCount: previous.reduce((n, r) => n + r.transaction_count, 0),
    uncategorized: selected
      .filter((r) => !r.category_id)
      .reduce((n, r) => n + r.transaction_count, 0),
    mixed: selected.concat(previous).some((r) => r.currency !== currency),
  };
}
export function groupCategories(
  items: CategoryAmount[],
  currency: Currency,
  other: string,
): CategoryAmount[] {
  if (items.length <= 6) return items;
  const rest = items.slice(5);
  const exact = rest.every((r) => typeof r.exact === "string")
    ? decimalMoney(
        rest.reduce(
          (sum, r) => sum + parseMoneyTotal(String(r.exact), currency),
          0n,
        ),
        currency,
      )
    : rest.reduce((sum, r) => sum + r.value, 0);
  const total = items.every((r) => typeof r.exact === "string")
    ? decimalMoney(items.reduce((sum, r) => sum + parseMoneyTotal(String(r.exact), currency), 0n), currency)
    : items.reduce((sum, r) => sum + r.value, 0);
  return [
    ...items.slice(0, 5),
    {
      id: "other",
      ids: rest.map((r) => r.id),
      name: other,
      color: "#83918b",
      exact,
      value: Number(exact),
      percent: ratio(exact, total, currency) ?? 0,
      count: rest.reduce((n, r) => n + r.count, 0),
    },
  ];
}
export function periodIsPartial(period: Period, timezone: string) {
  if (period.partial !== undefined) return period.partial;
  const today = financialDate(new Date(), timezone);
  return today >= period.from && today < period.to;
}

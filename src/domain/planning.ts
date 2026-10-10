import type { Currency, MonthlyBudget, RecurringRule } from "@/types";
import { decimalMoney, parseMoney, parseMoneyTotal } from "./money.ts";
import { calendarDate, occurrenceDate } from "./recurrence.ts";

export interface ReservePlan {
  id: string;
  user_id: string;
  month: string;
  currency: Currency;
  name: string;
  amount: string;
  created_at: string;
}
export const debtTypes = [
  "credit_card",
  "personal",
  "car",
  "student",
  "mortgage",
  "bnpl",
  "family_friend",
  "custom",
] as const;
export type DebtType = (typeof debtTypes)[number];
export type PaymentFrequency = "monthly" | "biweekly" | "weekly";
export interface DebtPlan {
  id: string;
  user_id: string;
  debt_id: string;
  currency: Currency;
  debt_type: DebtType;
  scenario_principal: string;
  balance_as_of: string;
  apr_bps: number | null;
  rate_mode: "fixed" | "variable" | "manual";
  minimum_payment: string | null;
  frequency: PaymentFrequency;
  first_payment_date: string;
  custom_rank: number;
  created_at: string;
}

function monthIndex(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) < 1)
    throw new Error("Invalid financial month.");
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
}

export function monthBounds(month: string) {
  monthIndex(month);
  const end = new Date(`${month}-01T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  return {
    from: `${month}-01`,
    to: end.toISOString().slice(0, 10),
  };
}

/** A missing month resets rollover; deficits carry too. No projection is persisted. */
export function budgetBalances(budgets: MonthlyBudget[]) {
  const previous = new Map<string, { index: number; remaining: bigint | null }>();
  return [...budgets]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => {
      const month = b.month.slice(0, 7);
      const index = monthIndex(month);
      const key = `${b.user_id}/${b.category_id}/${b.currency}`;
      const prior = previous.get(key);
      const adjacent = prior && prior.index + 1 === index;
      const rollover = b.rollover_enabled && adjacent ? prior.remaining : 0n;
      const planned = parseMoney(b.amount, b.currency),
        posted = b.spent === undefined ? null : parseMoneyTotal(b.spent, b.currency);
      const available = rollover === null ? null : planned + rollover,
        remaining = available === null || posted === null ? null : available - posted;
      const threshold = b.alert_percent ?? 80;
      const alert =
        remaining === null || available === null || posted === null
          ? "unknown"
          : remaining < 0n
          ? "over"
          : available <= 0n || posted * 100n >= available * BigInt(threshold)
            ? "threshold"
            : "healthy";
      previous.set(key, { index, remaining });
      return {
        ...b,
        planned: decimalMoney(planned, b.currency),
        rollover: rollover === null ? null : decimalMoney(rollover, b.currency),
        available: available === null ? null : decimalMoney(available, b.currency),
        remaining: remaining === null ? null : decimalMoney(remaining, b.currency),
        alert,
      };
    });
}

/** Only confirmed rule assumptions; overdue unrecorded occurrences are separate. */
export function recurringForecast(
  rules: RecurringRule[],
  month: string,
  today: string,
  currency: Currency,
  category?: string,
) {
  const { from, to } = monthBounds(month);
  calendarDate(today);
  const occurrences: { rule: RecurringRule; date: string; overdue: boolean }[] =
    [];
  for (const rule of rules.filter(
    (r) =>
      r.active &&
      r.currency === currency &&
      (category === undefined || r.category_id === category),
  )) {
    for (let index = rule.next_index; index <= 100000; index++) {
      const date = occurrenceDate(
        {
          start: rule.start_date,
          end: rule.end_date,
          frequency: rule.frequency,
          interval: rule.interval,
        },
        index,
      );
      if (!date || date > to) break;
      if (date >= from)
        occurrences.push({ rule, date, overdue: date <= today });
      if (index - rule.next_index >= 10000)
        throw new Error(
          "Too many unrecorded occurrences. Review the recurring rule.",
        );
    }
  }
  const sum = (type: "income" | "expense", overdue: boolean) =>
    decimalMoney(
      occurrences
        .filter((o) => o.rule.type === type && o.overdue === overdue)
        .reduce((n, o) => n + parseMoney(o.rule.amount, currency), 0n),
      currency,
    );
  return {
    occurrences,
    income: sum("income", false),
    spending: sum("expense", false),
    overdueSpending: sum("expense", true),
    ruleCount: new Set(occurrences.map((o) => o.rule.id)).size,
  };
}

export function parseApr(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(value))
    throw new Error("APR needs at most two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (bps > 100000)
    throw new Error("APR exceeds the supported scenario range.");
  return bps;
}

export function paymentDate(
  start: string,
  frequency: PaymentFrequency,
  index: number,
) {
  return occurrenceDate(
    {
      start,
      frequency: frequency === "monthly" ? "monthly" : "weekly",
      interval: frequency === "biweekly" ? 2 : 1,
    },
    index,
  )!;
}
const periods = { monthly: 12, biweekly: 26, weekly: 52 };
export interface ScenarioDebt extends DebtPlan {
  direction: "i_owe" | "owed_to_me";
  name: string;
}
export interface ScheduleRow {
  date: string;
  principal: string;
  interest: string;
  payment: string;
  remaining: string;
  debt_id: string;
}
export function debtScenario(
  debts: ScenarioDebt[],
  currency: Currency,
  paymentBudget: string,
  strategy: "snowball" | "avalanche" | "custom",
  limit = 600,
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1200)
    throw new Error("Invalid scenario horizon.");
  const input = debts.filter((d) => d.direction === "i_owe");
  const unavailable = (reason: string) => ({
    status: "unavailable" as const,
    reason,
    rows: [] as ScheduleRow[],
    totalInterest: "0",
    payoffDate: null as string | null,
  });
  if (!input.length)
    return unavailable("No liability contracts in this scenario.");
  if (input.some((d) => d.currency !== currency))
    return unavailable("Choose debts in one native currency.");
  if (new Set(input.map((d) => d.id)).size !== input.length)
    return unavailable("Duplicate debt contracts.");
  if (
    input.some(
      (d) =>
        d.rate_mode !== "fixed" ||
        d.apr_bps === null ||
        d.minimum_payment === null,
    )
  )
    return unavailable(
      "Fixed APR and minimum payment are required for every debt.",
    );
  if (
    input.some(
      (d) =>
        d.frequency !== input[0].frequency ||
        d.first_payment_date !== input[0].first_payment_date ||
        d.balance_as_of !== input[0].balance_as_of,
    )
  )
    return unavailable(
      "Combined scenarios require the same frequency, first payment date and balance snapshot date.",
    );
  const budget = parseMoney(paymentBudget, currency);
  if (budget <= 0n) return unavailable("Enter a positive payment budget.");
  const items = input.map((d) => {
    calendarDate(d.balance_as_of);
    calendarDate(d.first_payment_date);
    if (
      d.first_payment_date < d.balance_as_of ||
      !Number.isInteger(d.apr_bps) ||
      d.apr_bps! < 0 ||
      d.apr_bps! > 100000
    )
      throw new Error("Invalid debt assumption.");
    const balance = parseMoney(d.scenario_principal, currency),
      minimum = parseMoney(d.minimum_payment!, currency);
    if (balance <= 0n || minimum <= 0n)
      throw new Error("Principal and minimum must be positive.");
    return { d, balance, minimum };
  });
  if (items.reduce((n, i) => n + i.minimum, 0n) > budget)
    return unavailable(
      "Payment budget is below the combined minimum payments.",
    );
  let interestTotal = 0n;
  const rows: ScheduleRow[] = [];
  for (let index = 0; index < limit; index++) {
    const active = items.filter((i) => i.balance > 0n);
    if (!active.length)
      return {
        status: "paid_off" as const,
        reason: "",
        rows,
        totalInterest: decimalMoney(interestTotal, currency),
        payoffDate: rows.at(-1)?.date ?? null,
      };
    const rank = [...active].sort((a, b) =>
      strategy === "custom"
        ? a.d.custom_rank - b.d.custom_rank || a.d.id.localeCompare(b.d.id)
        : strategy === "avalanche"
          ? b.d.apr_bps! - a.d.apr_bps! ||
            (a.balance < b.balance
              ? -1
              : a.balance > b.balance
                ? 1
                : a.d.id.localeCompare(b.d.id))
          : a.balance < b.balance
            ? -1
            : a.balance > b.balance
              ? 1
              : a.d.id.localeCompare(b.d.id),
    );
    const allocations = active.map((i) => {
      const denominator = BigInt(periods[i.d.frequency] * 10000);
      const interest =
        (i.balance * BigInt(i.d.apr_bps!) + denominator / 2n) / denominator;
      const due = i.balance + interest;
      return { i, interest, due, payment: due < i.minimum ? due : i.minimum };
    });
    let extra = budget - allocations.reduce((n, a) => n + a.payment, 0n);
    for (const i of rank) {
      const a = allocations.find((a) => a.i === i)!;
      const room = a.due - a.payment,
        added = extra < room ? extra : room;
      a.payment += added;
      extra -= added;
    }
    for (const a of allocations) {
      if (a.payment <= a.interest)
        return {
          status: "negative_amortization" as const,
          reason:
            "A payment does not reduce principal. Increase its minimum or payment budget.",
          rows,
          totalInterest: decimalMoney(interestTotal, currency),
          payoffDate: null,
        };
      const principal = a.payment - a.interest;
      a.i.balance -= principal;
      interestTotal += a.interest;
      rows.push({
        date: paymentDate(a.i.d.first_payment_date, a.i.d.frequency, index),
        debt_id: a.i.d.debt_id,
        principal: decimalMoney(principal, currency),
        interest: decimalMoney(a.interest, currency),
        payment: decimalMoney(a.payment, currency),
        remaining: decimalMoney(a.i.balance, currency),
      });
    }
  }
  const paid = items.every((i) => i.balance === 0n);
  return {
    status: paid ? ("paid_off" as const) : ("horizon" as const),
    reason: paid ? "" : "Debt remains beyond the scenario horizon.",
    rows,
    totalInterest: decimalMoney(interestTotal, currency),
    payoffDate: paid ? (rows.at(-1)?.date ?? null) : null,
  };
}

/** Pure review boundary. Deliberately no persistence or ledger adapter. */
export function repaymentPreview(input: {
  currency: Currency;
  debtCurrency: Currency;
  accountCurrency: Currency;
  direction: "i_owe" | "owed_to_me";
  outstanding: string;
  principal: string;
  interest: string;
  fees: string;
  cash: string;
}) {
  const { currency } = input;
  if (currency !== input.debtCurrency || currency !== input.accountCurrency)
    throw new Error("Repayment requires matching native currencies.");
  const [outstanding, principal, interest, fees, cash] = [
    input.outstanding,
    input.principal,
    input.interest,
    input.fees,
    input.cash,
  ].map((v) => parseMoney(v, currency));
  if (
    outstanding < 0n ||
    principal < 0n ||
    interest < 0n ||
    fees < 0n ||
    cash <= 0n ||
    principal > outstanding ||
    cash !== principal + interest + fees
  )
    throw new Error(
      "Cash must equal principal + actual interest + fees, without overpayment.",
    );
  const sign = input.direction === "i_owe" ? -1n : 1n;
  return {
    cashEffect: decimalMoney(sign * cash, currency),
    liabilityReduction: decimalMoney(
      input.direction === "i_owe" ? principal : 0n,
      currency,
    ),
    receivableReduction: decimalMoney(
      input.direction === "owed_to_me" ? principal : 0n,
      currency,
    ),
    expense: decimalMoney(
      input.direction === "i_owe" ? interest + fees : 0n,
      currency,
    ),
    income: decimalMoney(
      input.direction === "owed_to_me" ? interest + fees : 0n,
      currency,
    ),
  };
}

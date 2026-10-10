import { describe, expect, it } from "vitest";
import {
  budgetBalances,
  debtScenario,
  monthBounds,
  parseApr,
  paymentDate,
  recurringForecast,
  repaymentPreview,
  type ScenarioDebt,
} from "./planning";
import { parseMoney } from "./money";
import type { MonthlyBudget, RecurringRule } from "@/types";

const budget = (
  month: string,
  amount = "800.00",
  spent = "700.00",
  carry = false,
): MonthlyBudget => ({
  id: month,
  user_id: "u",
  category_id: "food",
  month: `${month}-01`,
  amount,
  spent,
  currency: "MYR",
  created_at: "",
  rollover_enabled: carry,
  alert_percent: 80,
});
const debt = (
  id = "one",
  overrides: Partial<ScenarioDebt> = {},
): ScenarioDebt => ({
  id,
  user_id: "u",
  debt_id: id,
  name: id,
  currency: "MYR",
  direction: "i_owe",
  debt_type: "personal",
  scenario_principal: "1000.00",
  balance_as_of: "2026-10-01",
  apr_bps: 1200,
  rate_mode: "fixed",
  minimum_payment: "100.00",
  frequency: "monthly",
  first_payment_date: "2026-10-31",
  custom_rank: 0,
  created_at: "",
  ...overrides,
});
const rule: RecurringRule = {
  id: "rent",
  user_id: "u",
  description: "Rent",
  amount: "700.00",
  currency: "MYR",
  type: "expense",
  category_id: "food",
  account_id: null,
  payment_method_id: null,
  start_date: "2026-09-30",
  end_date: null,
  frequency: "monthly",
  interval: 1,
  next_index: 1,
  active: true,
  created_at: "",
};

describe("deterministic budget projections", () => {
  it("preserves historical budget months and supports the final calendar month", () => {
    expect(
      budgetBalances([
        budget("1899-12"),
        budget("1900-01", "800", "0", true),
      ])[1].rollover,
    ).toBe("100.00");
    expect(monthBounds("0001-02")).toEqual({
      from: "0001-02-01",
      to: "0001-02-28",
    });
    expect(monthBounds("2024-02").to).toBe("2024-02-29");
    expect(monthBounds("9999-12").to).toBe("9999-12-31");
    expect(() => monthBounds("2026-13")).toThrow("Invalid financial month");
    expect(() => monthBounds("0000-01")).toThrow("Invalid financial month");
  });
  it("carries RM100 into RM900 and recalculates after historical edits", () => {
    const rows = [budget("2026-10", "800.00", "0", true), budget("2026-09")];
    expect(budgetBalances(rows)[1]).toMatchObject({
      rollover: "100.00",
      available: "900.00",
      remaining: "900.00",
    });
    rows[1].spent = "900.00";
    expect(budgetBalances(rows)[1]).toMatchObject({
      rollover: "-100.00",
      remaining: "700.00",
    });
    expect(rows[0].spent).toBe("0");
  });
  it("resets for gaps and opt out; does not mix owners/categories/currencies", () => {
    expect(
      budgetBalances([
        budget("2026-09"),
        budget("2026-11", "800", "0", true),
      ])[1].rollover,
    ).toBe("0.00");
    expect(
      budgetBalances([
        budget("2026-09"),
        budget("2026-10", "800", "0", false),
      ])[1].available,
    ).toBe("800.00");
    for (const key of ["user_id", "category_id", "currency"] as const) {
      const next = budget("2026-10", "800", "0", true);
      if (key === "currency") next.currency = "USD";
      else next[key] = "other";
      expect(budgetBalances([budget("2026-09"), next])[1].rollover).toBe(
        "0.00",
      );
    }
  });
  it("threshold is exact and deficit budgets stay explainable", () => {
    expect(budgetBalances([budget("2026-09", "800", "640")])[0].alert).toBe(
      "threshold",
    );
    expect(budgetBalances([budget("2026-09", "800", "639.99")])[0].alert).toBe(
      "healthy",
    );
    expect(
      budgetBalances([
        budget("2026-09", "800", "1601"),
        budget("2026-10", "800", "0", true),
      ])[1],
    ).toMatchObject({ available: "-1.00", remaining: "-1.00", alert: "over" });
  });
});
describe("unposted recurring assumptions", () => {
  it("does not count posted indices, paused rules, other currencies or clamp drift", () => {
    const copy = structuredClone(rule);
    const result = recurringForecast(
      [
        rule,
        { ...rule, id: "paused", active: false },
        { ...rule, id: "usd", currency: "USD" },
      ],
      "2026-10",
      "2026-10-10",
      "MYR",
    );
    expect(result.spending).toBe("700.00");
    expect(result.occurrences[0].date).toBe("2026-10-30");
    expect(rule).toEqual(copy);
    expect(
      recurringForecast(
        [{ ...rule, next_index: 2 }],
        "2026-10",
        "2026-10-10",
        "MYR",
      ).ruleCount,
    ).toBe(0);
  });
  it("shows overdue unrecorded separately, supports partial/historical periods and zero inputs", () => {
    const result = recurringForecast(
      [{ ...rule, start_date: "2026-10-01", next_index: 0 }],
      "2026-10",
      "2026-10-10",
      "MYR",
    );
    expect(result.spending).toBe("0.00");
    expect(result.overdueSpending).toBe("700.00");
    expect(recurringForecast([], "2026-10", "2026-10-10", "MYR").income).toBe(
      "0.00",
    );
    expect(
      recurringForecast([rule], "2026-10", "2026-10-10", "MYR", "other")
        .ruleCount,
    ).toBe(0);
  });
});
describe("debt scenarios with explicit assumptions", () => {
  it("handles zero APR and an early full payoff without overpaying", () => {
    const result = debtScenario(
      [debt("one", { apr_bps: 0 })],
      "MYR",
      "600",
      "snowball",
    );
    expect(result.status).toBe("paid_off");
    expect(result.totalInterest).toBe("0.00");
    expect(result.rows.map((r) => r.payment)).toEqual(["600.00", "400.00"]);
    expect(result.payoffDate).toBe("2026-11-30");
  });
  it("orders snowball, avalanche and custom and redistributes excess after payoff", () => {
    const debts = [
      debt("small", {
        scenario_principal: "50",
        apr_bps: 0,
        minimum_payment: "10",
        custom_rank: 2,
      }),
      debt("large", {
        scenario_principal: "200",
        apr_bps: 2400,
        minimum_payment: "10",
        custom_rank: 1,
      }),
    ];
    const snow = debtScenario(debts, "MYR", "100", "snowball", 1),
      avalanche = debtScenario(debts, "MYR", "100", "avalanche", 1),
      custom = debtScenario(debts, "MYR", "100", "custom", 1);
    expect(snow.rows[0].payment).toBe("50.00");
    expect(snow.rows[1].payment).toBe("50.00");
    expect(avalanche.rows[0].payment).toBe("10.00");
    expect(custom.rows).toEqual(avalanche.rows);
  });
  it("rejects insufficient inputs, variable interest, cross currencies and receivables", () => {
    for (const d of [
      debt("x", { apr_bps: null }),
      debt("x", { minimum_payment: null }),
      debt("x", { rate_mode: "variable" }),
      debt("x", { rate_mode: "manual" }),
      debt("x", { currency: "USD" }),
      debt("x", { direction: "owed_to_me" }),
    ])
      expect(debtScenario([d], "MYR", "100", "avalanche").status).toBe(
        "unavailable",
      );
    expect(debtScenario([debt()], "MYR", "99", "snowball").reason).toContain(
      "minimum",
    );
    expect(
      debtScenario(
        [debt(), debt("b", { frequency: "weekly" })],
        "MYR",
        "200",
        "snowball",
      ).status,
    ).toBe("unavailable");
  });
  it("does not promise payoff for negative amortization or a short horizon", () => {
    expect(
      debtScenario(
        [debt("one", { apr_bps: 2400, minimum_payment: "10" })],
        "MYR",
        "10",
        "snowball",
      ).status,
    ).toBe("negative_amortization");
    expect(
      debtScenario([debt()], "MYR", "100", "snowball", 1).payoffDate,
    ).toBeNull();
  });
  it("preserves exact schedule identities across synthetic balances/rates and JPY", () => {
    for (const currency of ["MYR", "JPY"] as const)
      for (let principal = 1; principal <= 30; principal++)
        for (const apr_bps of [0, 100, 1200]) {
          const d = debt("x", {
            currency,
            scenario_principal: String(principal * 100),
            minimum_payment: "100",
            apr_bps,
          });
          const original = structuredClone(d);
          const r = debtScenario([d], currency, "200", "avalanche");
          expect(r.status).toBe("paid_off");
          let outstanding = parseMoney(d.scenario_principal, currency);
          for (const row of r.rows) {
            const p = parseMoney(row.principal, currency),
              i = parseMoney(row.interest, currency);
            expect(parseMoney(row.payment, currency)).toBe(p + i);
            outstanding -= p;
            expect(parseMoney(row.remaining, currency)).toBe(outstanding);
          }
          expect(outstanding).toBe(0n);
          expect(d).toEqual(original);
        }
  });
  it("anchors dates, supports weekly/biweekly and rejects invalid APR input", () => {
    expect(paymentDate("2024-01-31", "monthly", 1)).toBe("2024-02-29");
    expect(paymentDate("2024-01-31", "monthly", 2)).toBe("2024-03-31");
    expect(paymentDate("2026-10-01", "biweekly", 1)).toBe("2026-10-15");
    expect(paymentDate("2026-10-01", "weekly", 1)).toBe("2026-10-08");
    expect(parseApr("12.34")).toBe(1234);
    expect(parseApr("")).toBeNull();
    expect(() => parseApr("12.345")).toThrow();
  });
});
describe("unactivated repayment review boundary", () => {
  const input = {
    currency: "MYR" as const,
    debtCurrency: "MYR" as const,
    accountCurrency: "MYR" as const,
    direction: "i_owe" as const,
    outstanding: "1000",
    principal: "480",
    interest: "120",
    fees: "0",
    cash: "600",
  };
  it("RM600 = RM480 liability reduction + RM120 expense; cash falls by RM600", () =>
    expect(repaymentPreview(input)).toMatchObject({
      cashEffect: "-600.00",
      liabilityReduction: "480.00",
      expense: "120.00",
    }));
  it("card settlement principal is not another purchase expense", () =>
    expect(
      repaymentPreview({ ...input, principal: "600", interest: "0" }).expense,
    ).toBe("0.00"));
  it("separates receivables and rejects overpayment, mismatch, negative components", () => {
    expect(
      repaymentPreview({ ...input, direction: "owed_to_me" }),
    ).toMatchObject({
      cashEffect: "600.00",
      receivableReduction: "480.00",
      liabilityReduction: "0.00",
      expense: "0.00",
      income: "120.00",
    });
    for (const patch of [
      { principal: "1001" },
      { cash: "601" },
      { fees: "-1" },
      { accountCurrency: "USD" as const },
      { outstanding: "-1" },
    ])
      expect(() => repaymentPreview({ ...input, ...patch })).toThrow();
  });
});

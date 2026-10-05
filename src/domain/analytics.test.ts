import { describe, expect, it, afterEach } from "vitest";
import {
  analyzePeriod,
  analyticsPeriod,
  categoryColor,
  difference,
  groupCategories,
  ratio,
  shiftMonth,
} from "./analytics";
import { dashboardFinancials } from "./dashboard";
import {
  sanitizePersonalization,
  defaultPersonalization,
} from "@/store/personalization";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency } from "@/services/currency";
import { swipeIntent } from "@/hooks/useNavigationGestures";
import { activitySemantic } from "@/components/ActivityIcon";
import type { MonthlyTotal, Transaction, Category } from "@/types";
const row = (
  month: string,
  type: "income" | "expense",
  amount: string,
  category_id: string | null = null,
): MonthlyTotal => ({
  user_id: "u",
  currency: "MYR",
  month,
  type,
  amount,
  category_id,
  transaction_count: 1,
});
afterEach(() => useAppStore.getState().resetPersonalization());
describe("analytics period and exact aggregation", () => {
  it("compares equal calendar windows across year and leap-month boundaries", () => {
    expect(analyticsPeriod("2024-02", 3)).toEqual({
      from: "2023-12-01",
      to: "2024-02-29",
      previousFrom: "2023-09-01",
      previousTo: "2023-11-30",
      months: 3,
    });
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("keeps very large amounts, fractions and changes exact", () => {
    const data = analyzePeriod(
      [
        row("2026-09", "income", "90071992547409.93"),
        row("2026-09", "expense", "0.10"),
        row("2026-09", "expense", "0.20"),
        row("2026-08", "expense", "0.10"),
      ],
      [],
      analyticsPeriod("2026-09", 1),
      "MYR",
      null,
      "Uncategorized",
    );
    expect(data.expense).toBe("0.30");
    expect(data.net).toBe("90071992547409.63");
    expect(difference(data.expense, data.previousExpense, "MYR")).toBe("0.20");
    expect(ratio("0.20", "0.10", "MYR")).toBe(200);
  });
  it("uses no percentage when prior income or spending is zero", () => {
    const data = analyzePeriod(
      [],
      [],
      analyticsPeriod("2026-09", 1),
      "MYR",
      null,
      "None",
    );
    expect(data.savingsRate).toBeNull();
    expect(data.count).toBe(0);
    expect(data.spending).toEqual([]);
    expect(ratio("20", "0", "MYR")).toBeNull();
  });
  it("excludes savings/debt legacy transactions and future transactions from ordinary analytics", () => {
    const tx = (
      activity_kind: Transaction["activity_kind"],
      date = "2026-09-05",
    ): Transaction => ({
      id: "t",
      user_id: "u",
      currency: "MYR",
      amount: "0.10",
      type: "expense",
      category_id: null,
      payment_method_id: null,
      description: "x",
      transaction_date: date,
      created_at: "",
      activity_kind,
    });
    const data = dashboardFinancials(
      [
        tx("ordinary"),
        tx("savings_allocation"),
        tx("debt_principal"),
        tx("ordinary", "2099-09-01"),
      ],
      [],
      "2026-09",
      "MYR",
      null,
      "Asia/Kuala_Lumpur",
      "en",
      "None",
    );
    expect(data.expenseExact).toBe("0.10");
  });
  it("requires valid conversion rates for mixed currencies", () => {
    expect(() =>
      analyzePeriod(
        [row("2026-09", "income", "1.00")],
        [],
        analyticsPeriod("2026-09", 1),
        "USD",
        null,
        "None",
      ),
    ).toThrow();
  });
  it("groups only secondary categories and preserves exact totals and drilldown ids", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      name: String(i),
      color: "#148575",
      exact: "0.10",
      value: 0.1,
      percent: 8.3,
      count: 1,
    }));
    const grouped = groupCategories(items, "MYR", "Other");
    expect(grouped).toHaveLength(6);
    expect(grouped[5].exact).toBe("0.70");
    expect(grouped[5].percent).toBe(58.3);
    expect(grouped[5].ids).toEqual(["5", "6", "7", "8", "9", "10", "11"]);
  });
  it("keeps category colors stable when category order changes", () => {
    const categories = [
      { id: "a", color: "#148575" },
      { id: "b", color: "#148575" },
    ] as Category[];
    expect(categoryColor("b", categories)).toBe(
      categoryColor("b", [...categories].reverse()),
    );
    expect(categoryColor("a", categories)).toBe("#148575");
    expect(categoryColor(null, categories)).toMatch(/^#/);
    const duplicates = Array.from({ length: 12 }, (_, i) => ({
      id: `category-${i}`,
      color: "#148575",
    })) as Category[];
    expect(
      new Set(duplicates.map((c) => categoryColor(c.id, duplicates))).size,
    ).toBe(1);
    expect(
      categoryColor("white", [{ id: "white", color: "#ffffff" }] as Category[]),
    ).toBe("#ffffff");
  });
});
describe("personalization and navigation", () => {
  it("persists safe options, deduplicates module order and rejects invalid values", () => {
    const settings = sanitizePersonalization({
      density: "compact",
      motion: "reduced",
      privacyMode: true,
      dashboardOrder: ["recent", "recent", "unsafe"],
      hiddenModules: ["pulse", "fake"],
      accent: "neon",
    });
    expect(settings.density).toBe("compact");
    expect(settings.motion).toBe("reduced");
    expect(settings.accent).toBe("prism");
    expect(settings.dashboardOrder).toEqual([
      "recent",
      "pulse",
      "cashFlow",
      "spending",
      "position",
    ]);
    expect(settings.hiddenModules).toEqual(["pulse"]);
  });
  it("masks exact displayed amounts and restores defaults without altering financial preferences", () => {
    const currency = useAppStore.getState().currency;
    useAppStore.getState().setPersonalization({
      privacyMode: true,
      analyticsBar: false,
      density: "compact",
    });
    expect(formatCurrency("90071992547409.93", "MYR")).toBe("MYR ••••••");
    useAppStore.getState().resetPersonalization();
    expect(useAppStore.getState().personalization).toEqual(
      defaultPersonalization,
    );
    expect(useAppStore.getState().currency).toBe(currency);
    expect(formatCurrency("0.10", "MYR")).toContain("0.10");
  });
  it("distinguishes legacy progress from cash income and spending", () => {
    expect(
      activitySemantic({
        type: "expense",
        activity_kind: "savings_allocation",
      }),
    ).toBe("savings");
    expect(
      activitySemantic({ type: "income", activity_kind: "debt_principal" }),
    ).toBe("debt");
    expect(activitySemantic({ type: "expense" })).toBe("expense");
  });
  it("opens at the edge, closes on the drawer, and ignores scrolling and middle swipes", () => {
    expect(
      swipeIntent({ x: 10, y: 200 }, { x: 120, y: 220 }, false, false),
    ).toBe("open");
    expect(swipeIntent({ x: 180, y: 200 }, { x: 50, y: 210 }, true, true)).toBe(
      "close",
    );
    expect(
      swipeIntent({ x: 120, y: 200 }, { x: 240, y: 210 }, false, false),
    ).toBeNull();
    expect(
      swipeIntent({ x: 10, y: 200 }, { x: 40, y: 350 }, false, false),
    ).toBeNull();
    expect(
      swipeIntent({ x: 180, y: 200 }, { x: 50, y: 210 }, true, false),
    ).toBeNull();
  });
});

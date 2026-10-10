import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockSignedInApp, rows, supabaseUrl, userId } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockSignedInApp(page);
  await page.clock.setFixedTime(new Date("2026-10-10T04:00:00Z"));
});
test("rollover uses posted expense, recalculates history and reserves never post money", async ({
  page,
}) => {
  rows.categories.push({
    id: "food",
    user_id: userId,
    name: "Food",
    type: "expense",
    color: "#123456",
    created_at: "",
  });
  rows.transactions = [
    {
      id: "sept",
      user_id: userId,
      account_id: null,
      payment_method_id: null,
      amount: "700.00",
      currency: "MYR",
      type: "expense",
      category_id: "food",
      description: "Posted September",
      transaction_date: "2026-09-20T00:00:00Z",
      created_at: "",
      activity_kind: "ordinary",
    },
    {
      id: "earmark",
      user_id: userId,
      account_id: null,
      payment_method_id: null,
      amount: "500.00",
      currency: "MYR",
      type: "expense",
      category_id: "food",
      description: "Savings earmark",
      transaction_date: "2026-09-21T00:00:00Z",
      created_at: "",
      activity_kind: "savings_allocation",
    },
  ];
  rows.monthly_budgets = [
    {
      id: "sep",
      user_id: userId,
      month: "2026-09-01",
      category_id: "food",
      amount: "800.00",
      currency: "MYR",
      rollover_enabled: false,
      alert_percent: 80,
      created_at: "",
    },
    {
      id: "oct",
      user_id: userId,
      month: "2026-10-01",
      category_id: "food",
      amount: "800.00",
      currency: "MYR",
      rollover_enabled: true,
      alert_percent: 80,
      created_at: "",
    },
  ];
  await page.goto("/plans");
  await page.getByRole("button", { name: "Budgets", exact: true }).click();
  const section = page.getByRole("region", { name: "Budget planning" });
  await expect(section.getByText('Available', {exact:true}).locator('..').getByRole('definition')).toHaveText(/^MYR\s900\.00$/);
  await expect(section.getByText('Remaining', {exact:true}).locator('..').getByRole('definition')).toHaveText(/^MYR\s900\.00$/);
  const before = structuredClone(rows.transactions),
    repayments = structuredClone(rows.debt_repayments),
    transfers = structuredClone(rows.transfers);
  await section.getByLabel("Reserve name").fill("Rainy day");
  await section.getByLabel("Reserve amount").fill("1,500.00");
  await section.getByRole("button", { name: "Save reserve plan" }).click();
  await expect(section.getByText(/Rainy day:/)).toBeVisible();
  expect(rows.reserve_plans[0]).toMatchObject({ amount: "1500.00" });
  expect(rows.transactions).toEqual(before);
  expect(rows.debt_repayments).toEqual(repayments);
  expect(rows.transfers).toEqual(transfers);
  (rows.transactions[0] as Record<string, unknown>).amount = "900.00";
  await page.reload();
  await page.getByRole("button", { name: "Budgets", exact: true }).click();
  await expect(section.getByText(/^-MYR\s100\.00$/)).toBeVisible();
  await expect(section.getByText('Available', {exact:true}).locator('..').getByRole('definition')).toHaveText(/^MYR\s700\.00$/);
  await section.getByRole("button", { name: "Edit budget" }).click();
  await section.getByLabel("Carry previous month remaining").uncheck();
  await section.getByRole("button", { name: "Save budget" }).click();
  await expect(
    section
      .getByText("Rollover", { exact: true })
      .locator("..")
      .getByRole("definition"),
  ).toHaveText(/^MYR\s0\.00$/);
  await expect(
    section
      .getByText("Remaining", { exact: true })
      .locator("..")
      .getByRole("definition"),
  ).toHaveText(/^MYR\s800\.00$/);
  expect(rows.monthly_budgets).toHaveLength(2);
});
test("fixed debt assumptions create schedules and split preview has no money mutation", async ({
  page,
}) => {
  await page.goto("/debts");
  const section = page.getByRole("region", { name: "Debt planning scenarios" });
  await section.getByLabel("Planning debt").selectOption("debt-1");
  await section.getByLabel("Assumed outstanding principal").fill("1,000.00");
  await section.getByLabel("APR (%)").fill("0");
  await section.getByLabel("Minimum payment").fill("100");
  await section.getByRole("button", { name: "Save planning contract" }).click();
  await expect.poll(() => rows.debt_plans.length).toBe(1);
  expect(rows.debt_plans[0]).toMatchObject({ scenario_principal: "1000.00" });
  await section.getByLabel("Payment budget per period").fill("600");
  await expect(
    section.getByRole("status").filter({ hasText: "Illustrative payoff date" }),
  ).toContainText("2026-11-10");
  await expect(section.getByRole("table")).toContainText(/MYR\s400\.00/);
  await page.setViewportSize({width:390,height:844});
  const schedule=section.getByRole('region',{name:'Scrollable payment schedule'});
  expect(await schedule.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).include('[aria-label="Debt planning scenarios"]').analyze()).violations).toEqual([]);
  const requests: string[] = [];
  page.on("request", (r) => {
    if (
      ["POST", "PATCH", "DELETE"].includes(r.method()) &&
      r.url().includes("/rest/")
    )
      requests.push(r.url());
  });
  await section.getByLabel("Full cash amount").fill("600");
  await section.getByLabel("Actual principal", { exact: true }).fill("480");
  await section.getByLabel("Actual interest", { exact: true }).fill("120");
  await section.getByRole("button", { name: "Preview split" }).click();
  await expect(
    section.getByRole("status").filter({ hasText: "Cash effect" }),
  ).toContainText(/-MYR\s600\.00/);
  await expect(
    section.getByRole("status").filter({ hasText: "Cash effect" }),
  ).toContainText(/MYR\s480\.00/);
  expect(requests).toEqual([]);
  expect(rows.debt_repayments).toHaveLength(0);
  await section.getByLabel("Actual principal", { exact: true }).fill("1001");
  await section.getByRole("button", { name: "Preview split" }).click();
  await expect(section.getByRole("alert")).toContainText("without overpayment");
  await section.getByLabel("Interest mode").selectOption("variable");
  await section.getByRole("button", { name: "Save planning contract" }).click();
  await expect(
    section.getByRole("status").filter({ hasText: "Not enough data:" }),
  ).toContainText("Fixed APR");
  expect(rows.debt_plans).toHaveLength(1);
});
test("unposted recurring forecast stays separate from overdue assumptions and posted records", async ({
  page,
}) => {
  rows.recurring_rules = [
    {
      id: "salary",
      user_id: userId,
      description: "Assumed salary",
      amount: "3000.00",
      currency: "MYR",
      type: "income",
      category_id: null,
      account_id: null,
      payment_method_id: null,
      start_date: "2026-10-25",
      end_date: null,
      frequency: "monthly",
      interval: 1,
      next_index: 0,
      active: true,
      created_at: "",
    },
    {
      id: "rent",
      user_id: userId,
      description: "Unrecorded rent",
      amount: "800.00",
      currency: "MYR",
      type: "expense",
      category_id: null,
      account_id: null,
      payment_method_id: null,
      start_date: "2026-10-01",
      end_date: null,
      frequency: "monthly",
      interval: 1,
      next_index: 0,
      active: true,
      created_at: "",
    },
  ];
  const before = structuredClone(rows.transactions);
  await page.goto("/plans");
  await page.getByRole("button", { name: "Budgets", exact: true }).click();
  const section = page.getByRole("region", { name: "Budget planning" });
  await expect(section.getByText(/Future rule income:/)).toContainText(
    /MYR\s3,000\.00/,
  );
  await expect(section.getByText(/Overdue unrecorded spending:/)).toContainText(
    /MYR\s800\.00/,
  );
  expect(rows.transactions).toEqual(before);
});
test("repayment trail cannot be removed from debt screen", async ({ page }) => {
  rows.debt_repayments.push({
    id: "repay",
    debt_id: "debt-1",
    user_id: userId,
    currency: "MYR",
    amount: "20.00",
    transaction_id: null,
    account_id: null,
    note: "",
    paid_at: "2026-10-01T00:00:00Z",
    created_at: "",
  });
  await page.goto("/debts");
  await page.getByRole("button", { name: /Alex/ }).click();
  await expect(
    page.getByRole("button", { name: "Delete debt with Alex" }),
  ).toBeDisabled();
  await expect(
    page.getByText("History preserved", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove", exact: true }),
  ).toHaveCount(0);
});
test("planning forms have accessible labels and contain mobile layouts in English and Malay", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/plans");
  await page.getByRole("button", { name: "Budgets", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Budget planning" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include('[aria-label="Budget planning"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  (rows.profiles[0] as Record<string, unknown>).language = "ms";
  await page.reload();
  await page.getByRole("button", { name: "Bajet", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bajet kategori bulanan" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/debts");
  await expect(
    page.getByRole("region", { name: "Senario perancangan hutang" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include('[aria-label="Senario perancangan hutang"]')
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("planning errors are actionable and retry is available", async ({
  page,
}) => {
  await page.route(supabaseUrl + "/rest/v1/exact_reserve_plans*", (r) =>
    r.fulfill({ status: 403, json: { message: "Fixture permission denied" } }),
  );
  await page.goto("/plans");
  await page.getByRole("button", { name: "Budgets", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Fixture permission denied" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

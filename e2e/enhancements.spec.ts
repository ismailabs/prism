import { expect, test } from "@playwright/test";
import { mockSignedInApp, rows, supabaseUrl, userId } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
// Desktop Edge interprets synthetic middle swipes as browser history navigation.
// Disable that desktop feature in touch emulation so each gesture reaches the app.
test.use({
  hasTouch: true,
  launchOptions: { args: ["--disable-features=OverscrollHistoryNavigation"] },
});
async function realistic(page: Parameters<typeof mockSignedInApp>[0]) {
  await mockSignedInApp(page);
  rows.categories = [
    {
      id: "cat-food",
      user_id: "11111111-1111-4111-8111-111111111111",
      name: "Food",
      type: "expense",
      color: "#148575",
      created_at: "",
    },
    {
      id: "cat-home",
      user_id: "11111111-1111-4111-8111-111111111111",
      name: "Home",
      type: "expense",
      color: "#577fc2",
      created_at: "",
    },
  ];
  const base = rows.transactions[0] as object;
  rows.transactions = [
    {
      ...base,
      id: "food",
      amount: "25.00",
      category_id: "cat-food",
      description: "Groceries",
    },
    {
      ...base,
      id: "home",
      amount: "75.00",
      category_id: "cat-home",
      description: "Rent",
    },
    {
      ...base,
      id: "legacy",
      amount: "10.00",
      category_id: "cat-food",
      activity_kind: "savings_allocation",
      description: "Legacy goal link",
    },
    {
      ...base,
      id: "income",
      amount: "300.00",
      type: "income",
      description: "Salary",
    },
    {
      ...base,
      id: "uncat",
      amount: "10.00",
      description: "Uncategorized expense",
    },
  ];
  await page.route("**/api/rates?*", (route) =>
    route.fulfill({
      json: {
        base: "MYR",
        rates: { MYR: 1, USD: 0.23, EUR: 0.21, JPY: 34 },
        updatedAt: Date.now(),
        source: "QA fixture",
      },
    }),
  );
  await page.route(supabaseUrl + "/rest/v1/finance_daily_totals*", (route) =>
    route.fulfill({
      json: [
        {
          user_id: userId,
          month: "2026-09", financial_date: "2026-09-20",
          currency: "MYR",
          type: "income",
          category_id: null,
          amount: "300.00",
          transaction_count: 1,
        },
        {
          user_id: userId,
          month: "2026-09", financial_date: "2026-09-20",
          currency: "MYR",
          type: "expense",
          category_id: "cat-food",
          amount: "25.00",
          transaction_count: 1,
        },
        {
          user_id: userId,
          month: "2026-09", financial_date: "2026-09-20",
          currency: "MYR",
          type: "expense",
          category_id: "cat-home",
          amount: "75.00",
          transaction_count: 1,
        },
        {
          user_id: userId,
          month: "2026-09", financial_date: "2026-09-20",
          currency: "MYR",
          type: "expense",
          category_id: null,
          amount: "10.00",
          transaction_count: 1,
        },
        {
          user_id: userId,
          month: "2026-08", financial_date: "2026-08-20",
          currency: "MYR",
          type: "income",
          category_id: null,
          amount: "200.00",
          transaction_count: 1,
        },
        {
          user_id: userId,
          month: "2026-08", financial_date: "2026-08-20",
          currency: "MYR",
          type: "expense",
          category_id: "cat-food",
          amount: "150.00",
          transaction_count: 3,
        },
      ],
    }),
  );
}
test("analytics includes every server aggregate beyond the API row limit", async ({
  page,
}) => {
  await realistic(page);
  const calls: number[] = [];
  await page.route(
    supabaseUrl + "/rest/v1/finance_daily_totals*",
    (route) => {
      const offset = Number(
        new URL(route.request().url()).searchParams.get("offset") ?? 0,
      );
      calls.push(offset);
      const aggregate = {
        user_id: userId,
        month: "2026-09", financial_date: "2026-09-20",
        currency: "MYR",
        type: "expense",
        transaction_count: 1,
      };
      return route.fulfill({
        json:
          offset === 0
            ? Array.from({ length: 1000 }, (_, i) => ({
                ...aggregate,
                category_id: `category-${i}`,
                amount: "0.10",
              }))
            : [{ ...aggregate, category_id: "last-category", amount: "0.20" }],
      });
    },
  );
  await page.goto("/analytics");
  await page.getByLabel("Month", { exact: true }).fill("2026-09");
  await expect(page.locator(".analytics-metric.expense strong")).toHaveText(
    "MYR 100.20",
    { timeout: 20_000 },
  );
  expect(calls).toContain(1000);
});
test("donut selects a category and drills into the exact ordinary period with browser history", async ({
  page,
}) => {
  await realistic(page);
  await page.goto("/");
  await expect(page.locator(".snapshot")).toBeVisible({ timeout: 20000 });
  await page.getByLabel("Month", { exact: true }).fill("2026-09");
  const donut = page.getByRole("region", { name: "Spending breakdown" });
  await expect(donut.locator(".donut-svg")).toBeVisible();
  await expect(donut.locator(".donut-center")).toContainText("110.00");
  await donut.getByRole("button", { name: "Select Food", exact: true }).click();
  await expect(donut.locator(".donut-center")).toContainText("25.00");
  await donut.getByRole("button", { name: "View Food transactions" }).click();
  await expect(page).toHaveURL(/category=cat-food/);
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue(
    "cat-food",
  );
  await expect(page.locator(".finance-table")).toContainText("Groceries");
  await expect(page.locator(".finance-table")).not.toContainText(
    "Legacy goal link",
  );
  await expect(page.locator(".finance-table")).not.toContainText("Rent");
  await page.goBack();
  await expect(page.locator(".snapshot")).toBeVisible();
});
test("analytics calculates comparison and supports income and uncategorized drilldown", async ({
  page,
}) => {
  await realistic(page);
  await page.goto("/analytics");
  await page.getByLabel("Month", { exact: true }).fill("2026-09");
  await expect(page.locator(".analytics-metric").nth(1)).toContainText(
    "110.00",
    { timeout: 20_000 },
  );
  await expect(page.locator(".analytics-metric").nth(1)).toContainText("-MYR");
  await expect(
    page.locator(".analytics-metric.expense .money-group").first(),
  ).toHaveCSS("color", "rgb(180, 66, 66)");
  await expect(
    page.locator(".analytics-metric.income .money-group").first(),
  ).toHaveCSS("color", "rgb(8, 119, 95)");
  expect(
    await page
      .locator(".analytics-metric.expense .money-group")
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await expect(page.locator(".analytics-metric").nth(1)).toContainText("40.00");
  await expect(page.locator(".analytics-metric").nth(1)).toContainText(
    "-26.7%",
  );
  await page.getByLabel("Period", { exact: true }).selectOption("last-3-months");
  await expect(page.locator(".analytics-metric").first()).toContainText(
    "500.00",
  );
  await page.getByLabel("Period", { exact: true }).selectOption("month");
  await page.getByLabel("Month", {exact:true}).fill("2026-09");
  const income = page.getByRole("region", { name: "Income by category" });
  await income
    .getByRole("button", { name: "Select Uncategorized", exact: true })
    .click();
  await income
    .getByRole("button", { name: "View Uncategorized transactions" })
    .click();
  await expect(page).toHaveURL(/type=income/);
  await expect(page.locator(".finance-table")).toContainText("Salary");
});
test("personalization persists and reset keeps profile and financial data", async ({
  page,
}) => {
  await realistic(page);
  await page.goto("/settings");
  const settings = page.locator(".personalization-settings");
  await settings.getByLabel("Transaction density").selectOption("compact");
  await settings.getByLabel("Motion", { exact: true }).selectOption("reduced");
  await expect(page.locator(".page-heading")).toHaveCSS(
    "animation-name",
    "none",
  );
  await settings.getByLabel("Motion", { exact: true }).selectOption("full");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".page-heading")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await settings.getByLabel("Motion", { exact: true }).selectOption("reduced");
  await settings.getByLabel("Show analytics summary bar").uncheck();
  await settings.getByLabel("Privacy Mode", { exact: true }).check();
  await expect(page.locator(".analytics-bar")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await expect(
    settings.getByLabel("Privacy Mode", { exact: true }),
  ).toBeChecked();
  await page.goto("/transactions");
  await expect(page.locator(".finance-table")).toContainText("MYR ••••••");
  await expect(page.locator(".finance-table")).not.toContainText("25.00");
  await page.goto("/settings");
  await settings
    .getByRole("button", { name: "Restore personalization defaults" })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-density",
    "comfortable",
  );
  await expect(
    settings.getByLabel("Privacy Mode", { exact: true }),
  ).not.toBeChecked();
  await expect(page.getByLabel("Financial timezone")).toHaveValue(
    "Asia/Kuala_Lumpur",
  );
  await expect(page.locator(".analytics-bar")).toBeVisible();
  await settings.getByLabel("Show Cash flow").uncheck();
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Cash flow", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".snapshot")).toBeVisible();
});
test("unavailable exchange rates never turn spending into a zero-value chart", async ({
  page,
}) => {
  await realistic(page);
  Object.assign(rows.profiles[0] as object, { currency: "USD" });
  await page.route("**/api/rates?*", (route) =>
    route.fulfill({ status: 503, json: { error: "Rates unavailable" } }),
  );
  await page.goto("/");
  await page.getByLabel("Month", { exact: true }).fill("2026-09");
  const spending = page.locator(".module-spending");
  await expect(spending.getByRole("status")).toBeVisible({ timeout: 20_000 });
  await expect(spending.locator(".donut-visual")).toHaveCount(0);
  await expect(spending).not.toContainText("$0.00");
  await spending
    .getByRole("button", { name: "Transactions", exact: true })
    .click();
  await expect(page).toHaveURL(/activity=ordinary/);
  await expect(page.locator(".finance-table")).toContainText("25.00");
});
test("command palette and global Quick Add remain keyboard accessible", async ({
  page,
}) => {
  await realistic(page);
  await page.goto("/accounts");
  await expect(
    page.getByRole("button", { name: "Quick navigation", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("dialog", { name: "Quick navigation" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Search pages and actions…" })
    .fill("Analytics");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/analytics/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Alt+n");
  await expect(
    page.getByRole("dialog", { name: "Add transaction" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+p");
  await expect(
    page.getByRole("button", { name: "Privacy Mode", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("mobile edge gesture opens drawer; left gesture and Escape close it; scroll is ignored", async ({
  page,
}) => {
  await realistic(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/transactions");
  await expect(page.locator("main h1")).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  let gestureTime = Date.parse("2026-10-01T04:00:00Z");
  async function swipe(x: number, y: number, endX: number, endY: number, duration = 200) {
    // CDP transport latency is not gesture duration. Control Date only; CSS and
    // timers still run normally, and the actual 700 ms product guard is retained.
    await page.clock.setFixedTime(gestureTime);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: endX, y: endY }],
    });
    await page.clock.setFixedTime(gestureTime + duration);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    gestureTime += duration + 1000;
  }
  await swipe(8, 300, 24, 170);
  await expect(page.locator(".mobile-nav-panel")).toHaveCount(0);
  await swipe(100, 300, 230, 305);
  await expect(page.locator(".mobile-nav-panel")).toHaveCount(0);
  await swipe(8, 300, 125, 309, 700);
  await expect(page.locator(".mobile-nav-panel")).toHaveCount(0);
  await swipe(8, 300, 125, 309);
  await expect(page.locator(".mobile-nav-panel")).toBeVisible();
  await expect
    .poll(async () =>
      Math.round((await page.locator(".mobile-nav-panel").boundingBox())!.x),
    )
    .toBe(0);
  await swipe(180, 300, 35, 303);
  await expect(page.locator(".mobile-nav-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});
for (const [locale, theme] of [["en", "light"], ["en", "dark"], ["ms", "light"], ["ms", "dark"]] as const) {
for (const width of [320, 360, 375, 390, 414, 640, 768, 1024, 1280, 1440]) {
test(`new analytics and settings reflow with large amounts: ${locale}/${theme}/${width}px`, async ({
  page,
}) => {
  await realistic(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  rows.categories = Array.from({ length: 16 }, (_, i) => ({
    id: `cat-${i}`,
    name: `Category ${i} with a longer label`,
    color: ["#148575", "#577fc2", "#a271b4", "#c38a45"][i % 4],
    type: "expense",
  }));
  await page.route(supabaseUrl + "/rest/v1/finance_daily_totals*", (route) =>
    route.fulfill({
      json: rows.categories.map((c, i) => ({
        user_id: userId,
        month: "2026-09", financial_date: "2026-09-20",
        currency: "MYR",
        type: "expense",
        category_id: (c as { id: string }).id,
        amount: i === 0 ? "90071992547409.93" : "0.10",
        transaction_count: 1,
      })),
    }),
  );
    Object.assign(rows.profiles[0] as object, { language: locale, theme });
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/analytics", "/settings"]) {
        await page.goto(route);
        await expect(page.locator("main h1")).toBeVisible({timeout:20_000});
        if (route === "/analytics") {
          await page
            .getByLabel(locale === "ms" ? "Bulan" : "Month", { exact: true })
            .fill("2026-09");
          await expect(page.locator(".donut-svg").first()).toBeVisible({
            timeout: 20000,
          });
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if ([390, 1440].includes(width))
          await page.screenshot({
            path: `artifacts/enhancement-${route.slice(1)}-${width}-${locale}-${theme}.png`,
            fullPage: true,
          });
      }
  expect(errors).toEqual([]);
});
}
}
test("favicon vector matches the PRISM logo", () => {
  expect(readFileSync("public/favicon.svg", "utf8")).toBe(
    readFileSync("public/prism.svg", "utf8"),
  );
});

test("analytics text retains contrast during its entrance animation", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await realistic(page);
  Object.assign(rows.profiles[0] as object, { language: "ms", theme: "dark" });
  await page.goto("/analytics");
  const metrics = page.locator(".analytics-metrics");
  await expect(metrics).toBeVisible({ timeout: 20_000 });
  // Reproduce the partially faded colors reported by CI, independently of CPU
  // speed or the instant at which axe happens to sample the page.
  const animationCount = await metrics.evaluate((element) => {
    const animations = element.getAnimations();
    for (const animation of animations) {
      animation.pause();
      animation.currentTime = 45;
    }
    return animations.length;
  });
  expect(animationCount).toBeGreaterThan(0);
  const result = await new AxeBuilder({ page })
    .include(".analytics-metrics")
    .withRules(["color-contrast"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("new surfaces, palette, and drawer pass WCAG AA accessibility scans", async ({
  page,
}) => {
  // Eight axe scans plus locale/theme navigation need a complete-workflow
  // deadline on small Windows hosts; all original accessibility assertions stay.
  test.setTimeout(240000);
  await realistic(page);
  for (const [locale, theme] of [
    ["en", "light"],
    ["ms", "dark"],
  ] as const) {
    Object.assign(rows.profiles[0] as object, { language: locale, theme });
    for (const route of ["/analytics", "/settings", "/transactions"]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator(".card").first()).toBeVisible({ timeout: 20_000 });
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    }
  }
  await page.getByRole("button", { name: "Navigasi pantas" }).click();
  const palette = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(palette.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  const drawer = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(drawer.violations).toEqual([]);
});

test('page labels retain WCAG AA contrast during entrance motion in both themes', async ({ page }) => {
  await realistic(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [locale, theme] of [['en', 'light'], ['ms', 'dark']] as const) {
    Object.assign(rows.profiles[0] as object, { language: locale, theme });
    await page.goto('/transactions');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
    else await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.locator('main h1')).toBeVisible();
    for (const fraction of [0.25, 0.75]) {
      const moving = await page.locator('.page-heading').evaluate((element, progress) => {
        const heading = element as HTMLElement;
        heading.style.animation = 'none';
        void heading.offsetWidth;
        heading.style.animation = '';
        void heading.offsetWidth;
        const animations = heading.getAnimations();
        for (const animation of animations) {
          animation.pause();
          animation.currentTime = Number(animation.effect?.getTiming().duration) * progress;
        }
        return animations.length;
      }, fraction);
      expect(moving).toBeGreaterThan(0);
      const result = await new AxeBuilder({ page }).include('.page-heading')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(result.violations).toEqual([]);
    }
  }
});

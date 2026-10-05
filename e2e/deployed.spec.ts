import { expect, test } from "@playwright/test";
import { mockSignedInApp, rows } from "./fixtures";

test("deployed live assets, rates, and account-deletion authentication guard are healthy", async ({
  request,
}) => {
  const icon = await request.get("/favicon.svg?v=2");
  const logo = await request.get("/prism.svg");
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");
  expect(await icon.text()).toBe(await logo.text());
  for (const path of [
    "/favicon.ico?v=2",
    "/favicon-32.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/");
  }
  const manifest = await request.get("/site.webmanifest");
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).icons).toHaveLength(2);
  const rates = await request.get("/api/rates?base=MYR");
  expect(rates.status()).toBe(200);
  const data = await rates.json();
  expect(data.base).toBe("MYR");
  expect(data.rates.MYR).toBe(1);
  expect(data.rates.USD).toBeGreaterThan(0);
  expect(data.source).toBeTruthy();
  expect(data.updatedAt).toBeGreaterThan(0);
  if (!process.env.PRISM_E2E_PUBLIC_KEY)
    throw new Error(
      "Set the public Supabase client key for live anonymous guard verification.",
    );
  const deletion = await request.post(
    `${process.env.PRISM_E2E_SUPABASE_URL}/rest/v1/rpc/delete_own_account`,
    {
      headers: { apikey: process.env.PRISM_E2E_PUBLIC_KEY },
      data: { confirmation: "DELETE" },
    },
  );
  expect([401, 403]).toContain(deletion.status());
});

test("deployed bundle renders protected routes and financial workflows with isolated API fixtures", async ({
  page,
}) => {
  const base = process.env.PRISM_E2E_BASE_URL;
  if (!base)
    throw new Error("Set PRISM_E2E_BASE_URL for deployed verification.");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("realtime"))
      errors.push(message.text());
  });
  if (process.env.PRISM_DEPLOYMENT_BYPASS) {
    await page.route(new URL(base).origin + "/**", async (route) =>
      route.continue({
        headers: {
          ...route.request().headers(),
          "x-vercel-protection-bypass": process.env.PRISM_DEPLOYMENT_BYPASS!,
          "x-vercel-set-bypass-cookie": "true",
        },
      }),
    );
  }
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Your money. A clearer picture." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Forgot password" }),
  ).toBeVisible();
  await mockSignedInApp(page);
  await page.goto("/");
  await expect(
    page.getByText("Tracked net flow", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Safe fixture transaction");
  await page.getByLabel("Amount", { exact: true }).fill("0.10");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/accounts");
  await expect(page.getByText("Everyday account")).toBeVisible();
  await page.getByRole("button", { name: "New transfer", exact: true }).click();
  await page.getByLabel("Source account").selectOption("account-1");
  await page.getByLabel("Destination account").selectOption("account-2");
  await page.getByLabel("Source amount").fill("10.00");
  await page.getByLabel("Destination amount").fill("2.30");
  await page
    .getByRole("button", { name: "Save transfer", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/plans");
  await expect(page.getByText("Emergency fund", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Savings", exact: true }).click();
  await expect(page.getByText("Travel fund", { exact: true })).toBeVisible();
  await page.goto("/debts");
  await expect(page.getByText("Alex", { exact: true })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByLabel("Financial timezone")).toHaveValue(
    "Asia/Kuala_Lumpur",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Workspace" })).toBeVisible();
  await page
    .getByRole("dialog", { name: "Workspace" })
    .getByRole("link", { name: "Transactions" })
    .click();
  await expect(page.getByRole("dialog", { name: "Workspace" })).toHaveCount(0);
  await page.screenshot({
    path: "artifacts/deployed-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("deployed finance surfaces render in Malay dark mode without production writes", async ({
  page,
}) => {
  test.setTimeout(180000);
  const base = process.env.PRISM_E2E_BASE_URL;
  if (!base)
    throw new Error("Set PRISM_E2E_BASE_URL for deployed verification.");
  if (process.env.PRISM_DEPLOYMENT_BYPASS)
    await page.route(new URL(base).origin + "/**", (route) =>
      route.continue({
        headers: {
          ...route.request().headers(),
          "x-vercel-protection-bypass": process.env.PRISM_DEPLOYMENT_BYPASS!,
          "x-vercel-set-bypass-cookie": "true",
        },
      }),
    );
  await mockSignedInApp(page);
  Object.assign(rows.profiles[0] as object, { language: "ms", theme: "dark" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/transactions",
      "/accounts",
      "/plans",
      "/goals",
      "/savings",
      "/debts",
      "/categories",
      "/payments",
      "/settings",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "ms");
      await expect(page.locator("html")).toHaveClass("dark");
      await expect(page.locator("main .card").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.getByRole("button", { name: "Urus 2FA", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Tambah transaksi", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "artifacts/deployed-malay-dark.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

import { expect, test } from '@playwright/test';
import { mockSignedInApp, rows, supabaseUrl, userId } from './fixtures';
import { mkdir, writeFile } from 'node:fs/promises';

for (const locale of ['en', 'ms'] as const) {
  test(`unchecked starter categories are reported as skipped ${locale}`, async ({ page }) => {
    await mockSignedInApp(page);
    rows.accounts = [];
    Object.assign(rows.profiles[0] as object, { language: locale });
    let categoryPosts = 0;
    await page.route(`${supabaseUrl}/rest/v1/categories*`, async route => {
      if (route.request().method() === 'POST') categoryPosts++;
      await route.fallback();
    });
    await page.route(`${supabaseUrl}/rest/v1/accounts*`, async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      await route.fulfill({ status: 403, json: { code: '42501', message: 'Synthetic account denial' } });
    });
    await page.goto('/dashboard');
    const setup = page.getByRole('region', { name: locale === 'en' ? 'Quick setup' : 'Persediaan ringkas', exact: true });
    await setup.getByLabel(locale === 'en' ? 'First account' : 'Akaun pertama', { exact: true }).fill('Synthetic pending account');
    await setup.getByRole('button', { name: locale === 'en' ? 'Save setup' : 'Simpan persediaan', exact: true }).click();
    await expect(setup.getByRole('alert')).toBeVisible();
    await expect(setup.getByRole('listitem').filter({ hasText: locale === 'en' ? 'Optional categories:' : 'Kategori pilihan:' }))
      .toHaveText(locale === 'en' ? 'Optional categories: Skipped' : 'Kategori pilihan: Dilangkau');
    expect(categoryPosts).toBe(0);
    expect(rows.categories).toEqual([]);
    expect(rows.accounts).toEqual([]);
  });

  test(`partial starter category save retries without duplicate writes ${locale}`, async ({ page }) => {
    await mockSignedInApp(page);
    rows.accounts = [];
    Object.assign(rows.profiles[0] as object, { language: locale });
    let denySecond = true;
    const categoryPosts: string[] = [];
    await page.route(`${supabaseUrl}/rest/v1/categories*`, async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      const category = route.request().postDataJSON() as { name: string };
      categoryPosts.push(category.name);
      if (denySecond && categoryPosts.length === 2) {
        denySecond = false;
        return route.fulfill({ status: 403, json: { code: '42501', message: 'Synthetic category denial' } });
      }
      await route.fallback();
    });
    await page.goto('/dashboard');
    const setup = page.getByRole('region', { name: locale === 'en' ? 'Quick setup' : 'Persediaan ringkas', exact: true });
    await setup.getByLabel(locale === 'en' ? 'First account' : 'Akaun pertama', { exact: true }).fill('Synthetic first account');
    await setup.getByRole('checkbox', { name: locale === 'en' ? 'Add starter categories' : 'Tambah kategori permulaan', exact: true }).check();
    const save = setup.getByRole('button', { name: locale === 'en' ? 'Save setup' : 'Simpan persediaan', exact: true });
    await save.click();
    await expect(setup.getByRole('alert')).toBeVisible();
    await expect(save).toBeEnabled();
    await expect(setup.getByRole('listitem').filter({ hasText: locale === 'en' ? 'Optional categories:' : 'Kategori pilihan:' }))
      .toHaveText(locale === 'en' ? 'Optional categories: Not yet complete' : 'Kategori pilihan: Belum selesai');
    expect(rows.categories).toHaveLength(1);
    expect(rows.accounts).toEqual([]);
    await save.click();
    await expect(setup).toHaveCount(0);
    expect(rows.categories).toHaveLength(3);
    expect(rows.accounts).toHaveLength(1);
    const names = locale === 'en' ? ['Food', 'Transport', 'Salary'] : ['Makanan', 'Pengangkutan', 'Gaji'];
    expect(categoryPosts).toEqual([names[0], names[1], names[1], names[2]]);
  });
}

test('clearing a drilldown clears its search and Back/Forward restores only URL context', async ({ page }) => {
  await mockSignedInApp(page);
  await page.goto('/transactions?activity=ordinary&search=Groceries&item=tx-1');
  const search = page.getByRole('textbox', { name: 'Search transactions…', exact: true });
  await expect(search).toHaveValue('Groceries');
  await expect(page.locator('.transaction-workspace')).toContainText('Groceries');
  await page.locator('.drilldown-banner').getByRole('button', { name: 'Clear analytics filters', exact: true }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(search).toHaveValue('');
  await page.goBack();
  await expect(search).toHaveValue('Groceries');
  await expect(page).toHaveURL(/item=tx-1/);
  await expect(page.locator('.drilldown-banner')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(search).toHaveValue('');
  await expect(page.locator('.drilldown-banner')).toHaveCount(0);
});

test('returning through navigation starts an unfiltered transaction visit', async ({ page }) => {
  await mockSignedInApp(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/transactions?search=Groceries');
  await expect(page.getByRole('textbox', { name: 'Search transactions…', exact: true })).toHaveValue('Groceries');
  const nav = page.locator('.desktop-sidebar nav');
  await nav.getByRole('link', { name: 'Accounts', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Accounts');
  await nav.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole('textbox', { name: 'Search transactions…', exact: true })).toHaveValue('');
});

test('six-month trend pages a large synthetic report with exact totals and bounded owner/date queries', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T04:00:00Z'));
  await mockSignedInApp(page);
  const report = Array.from({ length: 2005 }, (_, index) => ({
    user_id: userId, month: '2026-05', financial_date: '2026-05-15', currency: 'MYR',
    type: 'income', category_id: `synthetic-category-${index}`, amount: '0.01', transaction_count: 1,
  }));
  const trendRequests: { offset: number; limit: number; owner: string | null; bounds: string[]; order: string | null }[] = [];
  await page.route(`${supabaseUrl}/rest/v1/finance_daily_totals*`, async route => {
    const url = new URL(route.request().url());
    const bounds = url.searchParams.getAll('financial_date');
    if (!bounds.includes('gte.2026-05-01')) return route.fallback();
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 1000);
    trendRequests.push({ offset, limit, owner: url.searchParams.get('user_id'), bounds, order: url.searchParams.get('order') });
    await route.fulfill({ json: report.slice(offset, offset + limit) });
  });
  const started = Date.now();
  await page.goto('/dashboard');
  const chart = page.locator('.module-cashFlow section');
  await expect(chart.locator('summary')).toHaveText('Details');
  await chart.locator('summary').click();
  await expect(chart.getByRole('table').getByRole('row').filter({ hasText: 'May 26' })).toContainText('20.05');
  expect(trendRequests.map(request => request.offset)).toEqual([0, 1000, 2000]);
  for (const request of trendRequests) {
    expect(request.limit).toBe(1000);
    expect(request.owner).toBe(`eq.${userId}`);
    expect(request.bounds).toEqual(['gte.2026-05-01', 'lte.2026-10-31']);
    expect(request.order).toBe('financial_date.asc,currency.asc,type.asc,category_id.asc');
  }
  await mkdir('artifacts/public-launch', { recursive: true });
  await writeFile('artifacts/public-launch/large-report.json', JSON.stringify({
    evidenceClass: 'LOCAL-FIXTURE', checkedAtUTC: new Date().toISOString(),
    syntheticAggregateRows: report.length, requests: trendRequests, expectedExact: '20.05',
    renderMs: Date.now() - started, mobileNetworkProfile: 'NOT TESTED',
  }, null, 2) + '\n');
});

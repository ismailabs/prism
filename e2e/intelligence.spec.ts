import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSignedInApp, rows, userId, supabaseUrl } from './fixtures';

async function openAnalytics(page: Parameters<typeof mockSignedInApp>[0]) {
  // Navigation completion precedes the authenticated report queries on a cold
  // bundle. Wait for this owned source, then retain normal financial assertions.
  await Promise.all([page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === supabaseUrl && url.pathname === '/rest/v1/finance_daily_totals' &&
      url.searchParams.get('user_id') === `eq.${userId}` && response.status() === 200;
  }), page.goto('/analytics')]);
}

async function seed(page: Parameters<typeof mockSignedInApp>[0], language = 'en') {
  await mockSignedInApp(page);
  rows.profiles[0] = { ...(rows.profiles[0] as object), language };
  const base = { user_id: userId, currency: 'MYR', account_id: 'main', category_id: null, payment_method_id: null, created_at: '2026-10-01T00:00Z', transaction_date: '2026-10-01T00:00Z' };
  rows.transactions = [{ ...base, id: 'salary', type: 'income', amount: '5000.00', description: 'Salary' },
    { ...base, id: 'expense', type: 'expense', amount: '3000.00', description: 'Ordinary spending' },
    { ...base, id: 'principal', type: 'expense', activity_kind: 'debt_principal', amount: '500.00', description: 'Principal' }];
  rows.accounts = [{ id: 'main', user_id: userId, name: 'Main', currency: 'MYR', opening_balance: '1000.00', balance: '1500.00', archived: false, created_at: '' },
    { id: 'savings', user_id: userId, name: 'Savings', currency: 'MYR', opening_balance: '1000.00', balance: '2000.00', archived: false, created_at: '' }];
  rows.person_debts = [{ id: 'loan', user_id: userId, direction: 'i_owe', counterparty: 'Loan', currency: 'MYR', original_amount: '2000.00', due_date: '2026-10-25', notes: '', created_at: '', updated_at: '' }];
  rows.debt_repayments = [{ id: 'paid', user_id: userId, debt_id: 'loan', currency: 'MYR', amount: null, effective_amount: '500.00', transaction_id: 'principal', paid_at: '2026-10-01T00:00Z', note: '', created_at: '' }];
  rows.recurring_rules = [{ id: 'rent', user_id: userId, description: 'Planned rent', currency: 'MYR', amount: '700.00', type: 'expense', account_id: 'main', category_id: null, payment_method_id: null, start_date: '2026-10-26', end_date: null, frequency: 'monthly', interval: 1, next_index: 0, active: true, created_at: '' }];
  // Native synthetic view snapshot, including the own transfer and principal.
  await page.route(supabaseUrl + '/rest/v1/exact_accounts*', route => route.fulfill({ json: rows.accounts }));
  await page.clock.install({ time: new Date('2026-10-19T04:00Z') });
}
test('review reconciles ordinary flows, debt and native balance while future rent remains a scenario', async ({ page }) => {
  await seed(page); const writes: string[] = [];
  page.on('request', request => { if ((request.url().includes('/rest/v1/') && !request.url().endsWith('/rpc/financial_access_status')) && request.method() !== 'GET') writes.push(request.url()); });
  await openAnalytics(page);
  const center = page.getByRole('region', { name: 'Financial intelligence', exact: true });
  await expect(center.getByRole('table', { name: 'Recorded native balances', exact: true })).toContainText('MYR 3,500.00');
  const review = center.getByRole('region', { name: 'Guided financial review', exact: true });
  await expect(review).toContainText('Income: MYR 5,000.00'); await expect(review).toContainText('Expense: MYR 3,000.00');
  await expect(review).toContainText('Operating surplus: MYR 2,000.00'); await expect(review).toContainText('Surplus rate: 40.0%');
  await expect(review).toContainText('no complete reconciled statement or valuation history');
  await expect(center.getByRole('region', { name: 'Cash scenarios', exact: true })).toContainText('MYR 2,800.00');
  await expect(center.getByRole('table', { name: 'Known dates and plan assumptions', exact: true })).toContainText('Planned rent');
  expect(writes).toEqual([]); expect(rows.transactions).toHaveLength(3); expect(rows.action_receipts).toHaveLength(0);
  await page.screenshot({ path: 'artifacts/phase6/intelligence-desktop.png', fullPage: true });
  await review.getByRole('button', { name: 'Expense: MYR 3,000.00', exact: true }).click();
  await expect(page).toHaveURL(/currency=MYR/); await expect(page).toHaveURL(/activity=ordinary/);
  await expect(page.getByRole('table').getByText('Ordinary spending', { exact: true })).toBeVisible();
  await expect(page.getByRole('table').getByText('Principal', { exact: true })).toHaveCount(0);
});
test('budget example exposes unchanged-pace assumptions and review source', async ({ page }) => {
  await seed(page); rows.transactions = [{ id: 'food', user_id: userId, currency: 'MYR', amount: '610.00', type: 'expense', category_id: 'food', payment_method_id: null, account_id: 'main', description: 'Food', transaction_date: '2026-10-01T00:00Z', created_at: '' }];
  rows.monthly_budgets = [{ id: 'b', user_id: userId, category_id: 'food', currency: 'MYR', month: '2026-10-01', amount: '800.00', created_at: '' }];
  await page.goto('/analytics'); const center = page.getByRole('region', { name: 'Financial intelligence', exact: true });
  await expect(center).toContainText('Remaining: MYR 190.00 · 12 days remaining');
  await expect(center).toContainText('Run-rate estimate: MYR 995.26');
  await expect(center).toContainText('MYR 918.21 / MYR 1,072.31');
  const insights = center.getByRole('region', { name: 'Explainable insights', exact: true });
  await insights.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Review this budget pace', exact: true }) }).getByText('Why am I seeing this?', { exact: true }).click();
  await expect(insights).toContainText('Assumes unchanged pace');
  expect(await insights.getByRole('listitem').count()).toBeLessThanOrEqual(5);
});
test('daily scenarios paginate by source dates and do not post money', async ({ page }) => {
  await seed(page); rows.recurring_rules = [{ ...(rows.recurring_rules[0] as object), frequency: 'daily', start_date: '2026-10-20', amount: '0.10' }];
  await page.goto('/analytics');
  const center = page.getByRole('region', { name: 'Financial intelligence', exact: true });
  const table = center.getByRole('table', { name: 'Known dates and plan assumptions', exact: true });
  await expect(table.getByRole('row')).toHaveCount(11);
  await center.getByRole('navigation', { name: 'Scenario pages', exact: true }).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(table).toContainText('2026-10-29'); expect(rows.transactions).toHaveLength(3);
});
test('new intelligence supports Malay, privacy, keyboard, mobile and WCAG scans', async ({ page }) => {
  await seed(page, 'ms'); await page.setViewportSize({ width: 320, height: 740 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/analytics'); const center = page.getByRole('region', { name: 'Maklumat kewangan', exact: true });
  await expect(center).toContainText('Anggaran, bukan baki atau belanja dipos.');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const position = center.getByRole('region', { name: 'Kedudukan direkod boleh ditatal', exact: true });
  await expect(position).toHaveAttribute('tabindex', '0');
  expect(await position.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  const amount = position.getByRole('cell').filter({ has: page.getByRole('link', { name: 'RM 3,500.00', exact: true }) });
  expect(await amount.evaluate(el => getComputedStyle(el).whiteSpace)).toBe('nowrap');
  await position.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => position.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  const summary = center.getByText('Sumber dan takrif metrik', { exact: true }); await summary.focus(); await page.keyboard.press('Enter');
  await expect(center).toContainText('Suntingan sumber menyatakan semula laporan lama');
  const scan = await new AxeBuilder({ page }).include('.intelligence-center').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/phase6/intelligence-malay-mobile.png', fullPage: true });
  await page.keyboard.press('Alt+p');
  await expect(center).not.toContainText('3,500.00');
  await expect(center).not.toContainText('40.0%');
  await expect(center).toContainText('•••');
});
test('numeric transport and server denial remain visible failures, never fabricated zero', async ({ page }) => {
  await seed(page);
  await page.route(supabaseUrl + '/rest/v1/finance_daily_totals*', route => route.fulfill({ json: [{ user_id: userId, currency: 'MYR', type: 'income', month: '2026-10', financial_date: '2026-10-01', category_id: null, amount: Number('90071992547409.93'), transaction_count: 1 }] }));
  await openAnalytics(page); await expect(page.getByRole('alert').filter({ hasText: 'Invalid exact financial report.' })).toBeVisible();
  await page.route(supabaseUrl + '/rest/v1/finance_daily_totals*', route => route.fulfill({ status: 403, json: { message: 'Synthetic authorization denied PRIVATE_ACCOUNT_SENTINEL', code: '42501' } }));
  const denied = page.waitForResponse(response => response.url().startsWith(supabaseUrl + '/rest/v1/finance_daily_totals') && response.status() === 403);
  await page.reload(); await denied;
  await expect(page.getByRole('alert').filter({ hasText: 'This request is not authorized.' })).toBeVisible();
  await expect(page.getByText(/PRIVATE_ACCOUNT_SENTINEL|Synthetic authorization denied/)).toHaveCount(0);
});
test('a plan mutation refreshes the forecast and logout hides private sources', async ({ page }) => {
  await seed(page); await openAnalytics(page);
  const scenarios = page.getByRole('region', { name: 'Cash scenarios', exact: true });
  await expect(scenarios).toContainText('MYR 2,800.00');
  await scenarios.getByRole('link', { name: 'Planned rent', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Analytics', exact: true }).click();
  await expect(scenarios).toContainText('MYR 3,500.00'); await expect(scenarios).not.toContainText('MYR 2,800.00');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Financial intelligence', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main')).not.toContainText('Planned rent');
});
test('unmapped rules remain separate and all-time review has no invented comparison', async ({ page }) => {
  await seed(page); rows.recurring_rules[0] = { ...(rows.recurring_rules[0] as object), account_id: null };
  await openAnalytics(page);
  const scenarios = page.getByRole('region', { name: 'Cash scenarios', exact: true });
  await expect(scenarios).toContainText('MYR 3,500.00');
  await expect(scenarios).toContainText('excluded from this closing scenario');
  await expect(scenarios.getByRole('table', { name: 'Known dates and plan assumptions', exact: true })).toContainText('Planned rent');
  await page.getByLabel('Period', { exact: true }).selectOption('all-time');
  await expect(page.getByRole('region', { name: 'Explainable insights', exact: true })).not.toContainText('New category activity');
  await expect(page.getByRole('region', { name: 'Guided financial review', exact: true })).toContainText('No comparison selected.');
});
test('unavailable FX does not hide exact native position or guided review', async ({ page }) => {
  await seed(page);
  rows.transactions.push({ ...(rows.transactions[0] as object), id: 'yen-salary', currency: 'JPY', amount: '100', account_id: 'yen', description: 'Native yen income' });
  rows.accounts.push({ id: 'yen', user_id: userId, name: 'Yen', currency: 'JPY', opening_balance: '0', balance: '100', archived: false, created_at: '' });
  await page.route('**/api/rates?*', route => route.fulfill({ status: 503, json: { message: 'Synthetic unavailable FX' } }));
  await page.goto('/analytics');
  const review = page.getByRole('region', { name: 'Guided financial review', exact: true });
  await expect(review).toContainText('Income: ¥100');
  await expect(review).toContainText('Income: MYR 5,000.00');
  await expect(page.getByRole('table', { name: 'Recorded native balances', exact: true })).toContainText('¥100');
  await expect(page.locator('.analytics-metric')).toHaveCount(0);
});

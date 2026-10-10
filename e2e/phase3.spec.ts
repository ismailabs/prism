import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { authStorageKey, mockSignedInApp, rows, supabaseUrl } from './fixtures';

test('public homepage and demo make no financial requests, including before Auth settles', async ({ page }) => {
  const privateRequests: string[] = [];
  page.on('request', request => { if (/\/rest\/v1\/|\/realtime\/v1\//.test(request.url())) privateRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Life has many sides. See your money clearly.' })).toBeVisible();
  const preview = page.getByRole('region', { name: 'Synthetic product preview' });
  await expect(preview).toContainText('SYNTHETIC DEMO');
  await preview.getByRole('button', { name: 'Future', exact: true }).click();
  await expect(preview).toContainText('A target, not money in an account.');
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.locator('#auth-title')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Life has many sides. See your money clearly.' })).toBeVisible();
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'A little look inside.' })).toBeVisible();
  expect(privateRequests).toEqual([]);
  await expect(page.locator('.app-shell')).toHaveCount(0);
});

test('standalone synthetic demo stays isolated even with a signed-in session', async ({ page }) => {
  await mockSignedInApp(page);
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/rest/v1/')) requests.push(request.url()); });
  await page.goto('/demo');
  await expect(page.getByRole('region', { name: 'Synthetic product preview' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Test member');
  expect(requests).toEqual([]);
  expect(rows.transactions).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A little look inside.' })).toBeVisible();
  expect(requests).toEqual([]);
});

test('protected filtered link returns to its exact destination after fixture sign-in', async ({ page }) => {
  await mockSignedInApp(page);
  await page.addInitScript(key => localStorage.removeItem(key), authStorageKey);
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/rest/v1/')) requests.push(request.url()); });
  await page.goto('/transactions?type=expense&category=uncategorized');
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get('next')).toBe('/transactions?type=expense&category=uncategorized');
  expect(requests).toEqual([]);
  await page.getByLabel('Email address', { exact: true }).fill('member@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('FixturePassword123');
  await page.locator('.auth-form form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/transactions\?type=expense&category=uncategorized$/);
  await expect(page.getByRole('heading', { name: 'All transactions', exact: true })).toBeVisible();
  await expect(page.getByRole('table').getByText('Groceries', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator('.app-shell')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('next')).toBe('/transactions?type=expense&category=uncategorized');
});

test('external return links are rejected and signed-in login refresh reaches a real route', async ({ page }) => {
  await mockSignedInApp(page);
  await page.goto('/login?next=https%3A%2F%2Fevil.invalid');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.snapshot')).toBeVisible();
  await page.goto('/login?next=%2Faccounts');
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.getByRole('heading', { name: 'Accounts', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Accounts', exact: true })).toBeVisible();
  await page.goto('/there-is-no-such-route');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCount(0);
});

test('MFA gates a login return destination without private queries', async ({ page }) => {
  await mockSignedInApp(page);
  await page.addInitScript(key => {
    const session = JSON.parse(localStorage.getItem(key)!);
    session.user.factors = [{ id: 'factor-1', factor_type: 'totp', status: 'verified', friendly_name: 'Fixture authenticator' }];
    localStorage.setItem(key, JSON.stringify(session));
  }, authStorageKey);
  await page.route(supabaseUrl + '/auth/v1/user', route => route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', factors: [{ id: 'factor-1', factor_type: 'totp', status: 'verified', friendly_name: 'Fixture authenticator' }] } }));
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/rest/v1/')) requests.push(request.url()); });
  await page.goto('/login?next=%2Fdebts');
  await expect(page.getByRole('heading', { name: 'One more layer of security' })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(new URL(page.url()).searchParams.get('next')).toBe('/debts');
});

test('signup CTA and confirmation keep the safe callback destination', async ({ page }) => {
  let body: Record<string, unknown> = {};
  let callback = '';
  await page.route(supabaseUrl + '/auth/v1/signup*', route => {
    body = route.request().postDataJSON(); callback = new URL(route.request().url()).searchParams.get('redirect_to') ?? '';
    return route.fulfill({ json: { id: 'synthetic-unconfirmed-user', identities: [], email: 'signup@example.invalid' } });
  });
  await page.goto('/');
  await page.locator('.hero-actions').getByRole('link', { name: 'Create your space', exact: true }).click();
  await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
  await page.getByLabel('Your name', { exact: true }).fill('Synthetic member');
  await page.getByLabel('Email address', { exact: true }).fill('signup@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('FixturePassword123');
  await page.locator('form').getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('email');
  expect(body.email).toBe('signup@example.invalid');
  expect(body.data).toMatchObject({ prism_setup_preferences: { currency: 'MYR', financial_timezone: 'Asia/Kuala_Lumpur', language: 'en' } });
  expect(new URL(callback).pathname).toBe('/login');
  expect(new URL(callback).searchParams.get('next')).toBe('/dashboard');
  await expect(page.locator('.app-shell')).toHaveCount(0);
});

test('PKCE sign-in consumes its code and preserves the intended route', async ({ page }) => {
  await mockSignedInApp(page);
  await page.addInitScript(key => {
    localStorage.removeItem(key);
    localStorage.setItem(key + '-code-verifier', JSON.stringify('fixture-verifier'));
  }, authStorageKey);
  await page.goto('/login?next=%2Faccounts&code=fixture-oauth');
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.getByRole('heading', { name: 'Accounts', exact: true })).toBeVisible();
});

test('new signups get Malaysian setup defaults without changing an existing profile first', async ({ page }) => {
  await mockSignedInApp(page); rows.accounts = [];
  Object.assign(rows.profiles[0] as object, { currency: 'USD', financial_timezone: 'UTC' });
  await page.addInitScript(key => {
    const session = JSON.parse(localStorage.getItem(key)!);
    session.user.user_metadata.prism_setup_preferences = { currency: 'MYR', financial_timezone: 'Asia/Kuala_Lumpur', language: 'ms' };
    localStorage.setItem(key, JSON.stringify(session));
  }, authStorageKey);
  await page.goto('/dashboard');
  const setup = page.getByRole('region', { name: 'Quick setup' });
  await expect(setup.getByLabel('Primary currency')).toHaveValue('MYR');
  await expect(setup.getByLabel('Financial timezone')).toHaveValue('Asia/Kuala_Lumpur');
  await expect(setup.getByLabel('Setup language')).toHaveValue('ms');
  expect(rows.profiles[0]).toMatchObject({ currency: 'USD', financial_timezone: 'UTC' });
  await setup.getByRole('button', { name: 'Skip setup' }).click();
  expect(rows.accounts).toEqual([]);
});

test('partial starter-category failure stays reviewable and retry does not duplicate completed categories', async ({ page }) => {
  await mockSignedInApp(page); rows.accounts = [];
  let failed = false;
  await page.route(supabaseUrl + '/rest/v1/categories*', async route => {
    if (route.request().method() === 'POST' && route.request().postDataJSON().name === 'Transport' && !failed) {
      failed = true;
      await route.fulfill({ status: 503, json: { message: 'Synthetic category failure' } });
    } else await route.fallback();
  });
  await page.goto('/dashboard');
  const setup = page.getByRole('region', { name: 'Quick setup' });
  await setup.getByLabel('First account').fill('Retry account');
  await setup.getByLabel('Add starter categories').check();
  await setup.getByRole('button', { name: 'Save setup' }).click();
  await expect(setup.getByRole('alert')).toContainText('Synthetic category failure');
  expect(rows.categories).toHaveLength(1);
  expect(rows.accounts).toEqual([]);
  await setup.getByRole('button', { name: 'Save setup' }).click();
  await expect(setup).toHaveCount(0);
  expect(rows.categories).toHaveLength(3);
  expect(rows.accounts).toHaveLength(1);
});

for (const [locale, theme] of [['en', 'light'], ['ms', 'dark']] as const) {
  test(`public reflow, keyboard and accessibility in ${locale}/${theme}`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ locale, theme }) => localStorage.setItem('prism-preferences', JSON.stringify({ state: { locale, theme }, version: 1 })), { locale, theme });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: locale === 'en' ? 'Skip to content' : 'Langkau ke kandungan' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#public-main')).toBeFocused();
    await page.locator('.hero-copy .public-eyebrow').click();
    for (const width of [320, 360, 375, 390, 414, 640, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390 || width === 1440) {
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        expect(results.violations).toEqual([]);
        await page.screenshot({ path: `artifacts/phase3/public-${locale}-${theme}-${width}.png`, fullPage: true });
        if (width === 1440) {
          await page.locator('.public-header').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `artifacts/phase3/public-hero-${locale}-${theme}-${width}.png` });
        }
      }
    }
    const faq = page.locator('summary').filter({ hasText: locale === 'en' ? 'Does PRISM connect to my bank?' : 'Adakah PRISM bersambung ke bank saya?' });
    await faq.press('Enter');
    await expect(faq.locator('..')).toHaveAttribute('open', '');
    await page.setViewportSize({ width: 320, height: 360 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('guest language and theme controls persist without private requests', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Language', { exact: true }).selectOption('ms');
  await expect(page.getByRole('heading', { name: 'Hidup ada banyak sisi. Lihat wang anda dengan jelas.' })).toBeVisible();
  await page.getByRole('button', { name: 'Tukar tema warna' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('setup skips without financial writes and optional demo stays synthetic', async ({ page }) => {
  await mockSignedInApp(page); rows.accounts = [];
  const writes: string[] = [];
  page.on('request', request => { if (request.url().includes('/rest/v1/') && ['POST', 'PATCH', 'DELETE'].includes(request.method()) && !request.url().includes('/rpc/')) writes.push(request.url()); });
  await page.goto('/dashboard');
  const setup = page.getByRole('region', { name: 'Quick setup' });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByRole('button', { name: 'Skip setup' }).click();
  await expect(setup).toHaveCount(0);
  await page.reload();
  await expect(setup).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(rows.accounts).toEqual([]);
  expect(rows.transactions).toHaveLength(1);
});

test('setup validates before writes and saves exact chosen values with starter categories', async ({ page }) => {
  await mockSignedInApp(page); rows.accounts = [];
  Object.assign(rows.profiles[0] as object, { currency: 'USD', financial_timezone: 'Europe/London' });
  await page.goto('/dashboard');
  const setup = page.getByRole('region', { name: 'Quick setup' });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await expect(setup.getByLabel('Financial timezone')).toHaveValue('Europe/London');
  await setup.getByRole('button', { name: 'Use Malaysia defaults' }).click();
  await expect(setup.getByLabel('Primary currency')).toHaveValue('MYR');
  await expect(setup.getByLabel('Financial timezone')).toHaveValue('Asia/Kuala_Lumpur');
  await setup.getByLabel('First account').fill('My actual account');
  await setup.getByLabel('Opening balance').fill('1.234');
  await setup.getByRole('button', { name: 'Save setup' }).click();
  await expect(setup.getByRole('alert')).toContainText('never rounded');
  expect(rows.accounts).toEqual([]);
  expect((rows.profiles[0] as {currency: string}).currency).toBe('USD');
  await setup.getByLabel('Opening balance').fill('90071992547409.93');
  await setup.getByLabel('Add starter categories').check();
  await setup.getByRole('button', { name: 'Save setup' }).click();
  await expect(setup).toHaveCount(0);
  await expect.poll(() => rows.accounts.length).toBe(1);
  expect(rows.accounts[0]).toMatchObject({ name: 'My actual account', currency: 'MYR', opening_balance: '90071992547409.93' });
  expect(rows.categories).toHaveLength(3);
  expect(rows.profiles[0]).toMatchObject({ currency: 'MYR', financial_timezone: 'Asia/Kuala_Lumpur' });
  expect(rows.transactions).toHaveLength(1);
});

test('mobile workspace groups have working routes and restore drawer focus', async ({ page }) => {
  await mockSignedInApp(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/dashboard');
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'WORKSPACE' });
  for (const name of ['Money', 'Planning', 'Insights', 'Personal']) await expect(drawer.getByText(name, { exact: true })).toBeVisible();
  await drawer.getByRole('link', { name: 'Goals', exact: true }).click();
  await expect(page).toHaveURL(/\/goals$/);
  await expect(page.getByRole('heading', { name: 'Goals', exact: true })).toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('setup waits for server confirmation and keeps its controls locked while an account save is pending', async ({ page }) => {
  await mockSignedInApp(page); rows.accounts = [];
  let release!: () => void;
  let entered!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const requested = new Promise<void>(resolve => { entered = resolve; });
  let posts = 0;
  await page.route(supabaseUrl + '/rest/v1/accounts*', async route => {
    if (route.request().method() === 'POST') { posts++; entered(); await pending; }
    await route.fallback();
  });
  await page.goto('/dashboard');
  const setup = page.getByRole('region', { name: 'Quick setup' });
  await setup.getByLabel('First account').fill('Confirmed account');
  await setup.getByRole('button', { name: 'Save setup' }).click();
  await requested;
  try {
    await expect(setup).toBeVisible();
    await expect(setup.getByRole('button', { name: 'Saving setup…' })).toBeDisabled();
    await expect(setup.getByRole('button', { name: 'Skip setup' })).toBeDisabled();
    expect(rows.accounts).toEqual([]);
  } finally { release(); }
  await expect.poll(() => rows.accounts.length).toBe(1);
  await expect(setup).toHaveCount(0);
  expect(posts).toBe(1);
});

test('dashboard planning highlights use native amounts and planned records with working section links', async ({ page }) => {
  test.setTimeout(120_000);
  await mockSignedInApp(page);
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const month = `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}-01`;
  rows.categories = [{ id: 'food', name: 'Food', type: 'expense', color: '#b45309' }];
  rows.monthly_budgets = [{ id: 'budget', category_id: 'food', month, currency: 'MYR', amount: '100.00', spent: '120.00' }];
  rows.transactions.push({ id: 'budget-expense', user_id: '11111111-1111-4111-8111-111111111111', account_id: null, payment_method_id: null, category_id: 'food', currency: 'MYR', amount: '120.00', type: 'expense', description: 'Recorded budget spending', transaction_date: `${month}T00:00:00Z`, financial_date: month, activity_kind: 'ordinary', created_at: '' });
  const recordedTransactions = structuredClone(rows.transactions);
  rows.recurring_rules = [{ id: 'planned', description: 'Future rent record', amount: '25.00', currency: 'MYR', type: 'expense', account_id: null, category_id: null, payment_method_id: null, start_date: '2099-01-01', end_date: null, frequency: 'monthly', interval: 1, next_index: 0, active: true }];
  await page.goto('/dashboard');
  const highlights = page.getByRole('region', { name: 'Planning highlights' });
  await expect(highlights).toContainText('Budget reached: Food');
  await expect(highlights).toContainText('120.00');
  await expect(highlights).toContainText('Planned record; requires your confirmation. No money has moved.');
  await expect(highlights.locator('.planning-highlight')).toHaveCount(2);
  expect(rows.transactions).toEqual(recordedTransactions);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(highlights).toBeVisible();
    expect(await highlights.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  const accessibility = await new AxeBuilder({ page }).include('section[aria-label="Planning highlights"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('button', { name: 'Privacy Mode', exact: true }).click();
  await expect(highlights).not.toContainText('120.00');
  await expect(highlights).toContainText('••••••');
  await page.getByRole('button', { name: 'Privacy Mode', exact: true }).click();
  await page.screenshot({ path: 'artifacts/phase3/dashboard-planning.png', fullPage: true });
  await highlights.getByRole('button', { name: 'Review budgets' }).click();
  await expect(page).toHaveURL(/\/plans\?section=budgets$/);
  await expect(page.getByRole('heading', { name: 'Monthly category budgets', exact: true })).toBeVisible();
  await page.goBack();
  await expect(highlights).toBeVisible();
  await highlights.getByRole('button', { name: 'Review recurring activity' }).click();
  await expect(page).toHaveURL(/\/plans\?section=recurring$/);
  await expect(page.getByRole('button', { name: 'Record due occurrence' })).toBeDisabled();
  expect(rows.transactions).toEqual(recordedTransactions);
});

import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { authStorageKey, mockSignedInApp, readySecurityStatus, supabaseUrl, userId } from './fixtures';

// UI fixtures only. Native Auth/transaction rollback is tested separately.
async function locked(page: Page, status: Record<string, unknown>, factors: unknown[] = []) {
  await mockSignedInApp(page);
  await page.addInitScript(({ key, factors }) => {
    const session = JSON.parse(localStorage.getItem(key)!);
    session.user.factors = factors;
    localStorage.setItem(key, JSON.stringify(session));
  }, { key: authStorageKey, factors });
  await page.route(supabaseUrl + '/auth/v1/user', route => route.fulfill({ json: { id: userId, email: 'test@example.com', factors } }));
  await page.route(supabaseUrl + '/rest/v1/rpc/financial_access_status', route => route.fulfill({ json: { ...readySecurityStatus, allowed: false, activated: false, approvedFactorIds: [], currentFactorId: null, ...status } }));
  const financial: string[] = [];
  page.on('request', request => {
    if ((request.url().includes('/rest/v1/') && !request.url().endsWith('/rpc/financial_access_status')) || request.url().includes('/realtime/v1/')) financial.push(request.url());
  });
  return financial;
}

for (const locale of ['en', 'ms'] as const) test(`first enrollment requires independent mailbox proof before private queries (${locale})`, async ({ page }) => {
  await page.addInitScript(language => localStorage.setItem('prism-preferences', JSON.stringify({ state: { locale: language }, version: 1 })), locale);
  const financial = await locked(page, { reason: 'needs_mfa', mailboxVerified: false });
  await page.setViewportSize({ width: 320, height: 740 });
  let requests = 0;
  await page.route(supabaseUrl + '/auth/v1/otp*', route => {
    requests++;
    expect(route.request().postDataJSON()).toMatchObject({ email: 'test@example.com', create_user: false });
    return route.fulfill({ json: {} });
  });
  await page.goto('/accounts');
  await expect(page.getByRole('heading', { name: locale === 'en' ? 'Verify your existing email' : 'Sahkan e-mel sedia ada' })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCount(0);
  await page.getByRole('button', { name: locale === 'en' ? 'Send secure verification link' : 'Hantar pautan pengesahan selamat' }).press('Enter');
  await expect(page.getByRole('status')).toBeVisible();
  expect(requests).toBe(1);
  expect(financial).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `artifacts/security/enrollment-mail-${locale}.png`, fullPage: true });
});

test('fresh email alone exposes setup, never the financial workspace', async ({ page }) => {
  const financial = await locked(page, { reason: 'needs_mfa', mailboxVerified: true });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Set up authenticator', exact: true })).toBeVisible();
  await expect(page.getByText('0 of 2 authenticators approved.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Losing every authenticator and backup can permanently lock this account/)).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCount(0);
  expect(financial).toEqual([]);
});

test('one approved factor still requires backup enrollment', async ({ page }) => {
  const financial = await locked(page, { reason: 'needs_backup', mailboxVerified: true, approvedFactorIds: ['factor-1'], currentFactorId: 'factor-1' }, [{ id: 'factor-1', factor_type: 'totp', status: 'verified', friendly_name: 'Primary fixture' }]);
  await page.goto('/transactions');
  await expect(page.getByText('1 of 2 authenticators approved.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add an authenticator', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeDisabled();
  expect(financial).toEqual([]);
});

test('all-factor loss shows the locked recovery boundary without email-only rescue', async ({ page }) => {
  const financial = await locked(page, { reason: 'needs_mfa', activated: true, mailboxVerified: true });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'An approved authenticator is required' })).toBeVisible();
  await expect(page.getByText(/PRISM cannot safely restore financial access using only email or a password/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Set up authenticator', exact: true })).toHaveCount(0);
  expect(financial).toEqual([]);
});

test('security-status failure denies cached financial access', async ({ page }) => {
  const financial = await locked(page, {});
  await page.route(supabaseUrl + '/rest/v1/rpc/financial_access_status', route => route.fulfill({ status: 503, json: { message: 'Synthetic security service unavailable' } }));
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Verify your session', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCount(0);
  expect(financial).toEqual([]);
});

test('expired financial session requires fresh sign-in even with two factors', async ({ page }) => {
  const financial = await locked(page, { reason: 'session_expired', activated: true, approvedFactorIds: ['factor-1', 'factor-2'] });
  await page.goto('/accounts');
  await expect(page.getByText(/Your financial session has expired/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh session', exact: true })).toHaveCount(0);
  expect(financial).toEqual([]);
});

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

test('locked enrollment offers language switching and sign-out without finance reads', async ({ page }) => {
  const financial = await locked(page, { reason: 'needs_mfa', mailboxVerified: false });
  await page.goto('/accounts');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('ms');
  await expect(page.getByRole('heading', { name: 'Sahkan e-mel sedia ada', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log keluar', exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Wang anda. Gambaran lebih jelas.', exact: true })).toBeVisible();
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

test('factor-list retry recovers after a temporary provider failure without private reads', async ({ page }) => {
  const financial = await locked(page, { reason: 'needs_mfa', mailboxVerified: true });
  let unavailable = true;
  await page.route(supabaseUrl + '/auth/v1/user', route => unavailable
    ? route.fulfill({ status: 503, json: { message: 'Synthetic factor service unavailable' } })
    : route.fulfill({ json: { id: userId, email: 'test@example.com', factors: [] } }));
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Verify your session', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toBeVisible();
  unavailable = false;
  const healthyFactors = page.waitForResponse(response => response.url() === supabaseUrl + '/auth/v1/user' && response.status() === 200);
  await page.getByRole('button', { name: 'Refresh session', exact: true }).click();
  await healthyFactors;
  await expect(page.getByRole('button', { name: 'Set up authenticator', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.app-shell')).toHaveCount(0);
  expect(financial).toEqual([]);
});

test('security refresh preserves the selected backup authenticator and entered code', async ({ page }) => {
  const factors = [
    { id: 'factor-1', factor_type: 'totp', status: 'verified', friendly_name: 'Primary fixture' },
    { id: 'factor-2', factor_type: 'totp', status: 'verified', friendly_name: 'Backup fixture' },
  ];
  const financial = await locked(page, { reason: 'needs_mfa', activated: true, approvedFactorIds: ['factor-1', 'factor-2'] }, factors);
  let refreshed = false;
  await page.route(supabaseUrl + '/auth/v1/user', route => route.fulfill({ json: {
    id: userId, email: 'test@example.com', factors: factors.map(factor => ({ ...factor, friendly_name: factor.friendly_name + (refreshed ? ' refreshed' : '') })),
  } }));
  await page.goto('/accounts');
  const selector = page.getByRole('combobox', { name: 'Authenticator', exact: true });
  await selector.selectOption('factor-2');
  await page.getByLabel('Authentication code', { exact: true }).fill('123456');
  refreshed = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  // Changed option text proves the refreshed factor response has rendered.
  await expect(selector.locator('option[value="factor-2"]')).toHaveText('Backup fixture refreshed');
  await expect(selector).toHaveValue('factor-2');
  await expect(page.getByLabel('Authentication code', { exact: true })).toHaveValue('123456');
  expect(financial).toEqual([]);
});

async function recoveryAtMfaGate(page: Page) {
  const factors = [
    { id: 'factor-1', factor_type: 'totp', status: 'verified', friendly_name: 'Primary fixture' },
    { id: 'factor-2', factor_type: 'totp', status: 'verified', friendly_name: 'Backup fixture' },
  ];
  await locked(page, { reason: 'needs_mfa', activated: true, approvedFactorIds: ['factor-1', 'factor-2'] }, factors);
  await page.addInitScript(key => {
    localStorage.removeItem(key);
    localStorage.setItem(key + '-code-verifier', JSON.stringify('fixture-verifier/recovery'));
  }, authStorageKey);
  let verified = false;
  await page.route(supabaseUrl + '/rest/v1/rpc/financial_access_status', route => route.fulfill({ json: verified
    ? readySecurityStatus
    : { ...readySecurityStatus, allowed: false, reason: 'needs_mfa' } }));
  await page.goto('/?code=fixture-recovery&recovery=1');
  await expect(page.getByRole('heading', { name: 'One more layer of security.', exact: true })).toBeVisible();
  return { ready: () => { verified = true; } };
}

test('signing out of recovery clears reset mode before a later ordinary sign-in', async ({ page }) => {
  const recovery = await recoveryAtMfaGate(page);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your money. A clearer picture.', exact: true })).toBeVisible();
  recovery.ready();
  await page.getByLabel('Email address', { exact: true }).fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('FixtureStrongPassword123');
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set a new password', exact: true })).toHaveCount(0);
});

test('genuine recovery mode survives authenticator verification', async ({ page }) => {
  const recovery = await recoveryAtMfaGate(page);
  const session = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), authStorageKey);
  await page.route(supabaseUrl + '/auth/v1/factors/factor-1/challenge', route => route.fulfill({ json: { id: 'fixture-challenge', type: 'totp' } }));
  await page.route(supabaseUrl + '/auth/v1/factors/factor-1/verify', route => {
    expect(route.request().postDataJSON()).toMatchObject({ challenge_id: 'fixture-challenge', code: '123456' });
    recovery.ready();
    return route.fulfill({ json: session });
  });
  await page.getByLabel('Authentication code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Set a new password', exact: true })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCount(0);
});

test('expired financial session requires fresh sign-in even with two factors', async ({ page }) => {
  const financial = await locked(page, { reason: 'session_expired', activated: true, approvedFactorIds: ['factor-1', 'factor-2'] });
  await page.goto('/accounts');
  await expect(page.getByText(/Your financial session has expired/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh session', exact: true })).toHaveCount(0);
  expect(financial).toEqual([]);
});

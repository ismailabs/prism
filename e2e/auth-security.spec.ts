import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSignedInApp, readySecurityStatus, supabaseUrl } from './fixtures';

// This is a controllable third-party widget double, not a CAPTCHA bypass in the
// application. Every Auth request is intercepted at a synthetic provider URL.
async function challenge(page: Page, failsToLoad = false) {
  await page.route('https://challenges.cloudflare.com/**', route => failsToLoad ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: `
    let serial = 0; const widgets = new Map();
    window.turnstile = {
      render(container, options) {
        const id = String(++serial); widgets.set(id, container);
        container.dataset.widgetLanguage = options.language;
        container.style.width = options.size === 'compact' ? '150px' : '300px';
        for (const [label, callback] of [
          ['Complete synthetic security check', () => options.callback('fixture-token-' + id)],
          ['Expire synthetic security check', () => options['expired-callback']()],
          ['Fail synthetic security check', () => options['error-callback']('fixture-error')]
        ]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.onclick = callback; container.append(button); }
        return id;
      },
      remove(id) { widgets.get(id)?.replaceChildren(); widgets.delete(id); }
    };` }));
}
async function fillLogin(page: Page, locale: 'en' | 'ms' = 'en') {
  await page.getByLabel(locale === 'ms' ? 'Alamat e-mel' : 'Email address', { exact: true }).fill('new-prism-fixture@example.invalid');
  await page.getByLabel(locale === 'ms' ? 'Kata laluan' : 'Password', { exact: true }).fill('SyntheticStrongPassword123');
}

for (const locale of ['en', 'ms']) for (const hasVerifier of [false, true]) test(`failed PKCE link is sanitized in ${locale}, verifier ${hasVerifier}`, async ({ page }) => {
  await challenge(page);
  await page.addInitScript(({ language, verifier }) => {
    localStorage.setItem('prism-preferences', JSON.stringify({ state: { locale: language }, version: 1 }));
    if (verifier) localStorage.setItem('sb-fixture-auth-token-code-verifier', JSON.stringify('synthetic-verifier/recovery'));
  }, { language: locale, verifier: hasVerifier });
  let exchanges = 0;
  await page.route(supabaseUrl + '/auth/v1/token*', route => {
    exchanges++;
    return route.fulfill({ status: 400, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'X-Supabase-Api-Version' }, json: { code: 'flow_state_expired', msg: 'PRIVATE_PROVIDER_DETAIL' } });
  });
  await page.goto('/login?code=PRIVATE_EXPIRED_CODE&provider_token=PRIVATE_PROVIDER_TOKEN&next=%2Ftransactions');
  await expect(page.getByRole('alert')).toHaveText(locale === 'ms' ? 'Pautan akaun ini tidak sah atau telah tamat tempoh. Minta e-mel pengesahan atau pemulihan kata laluan baharu.' : 'This account link is invalid or has expired. Request a new confirmation or password recovery email.');
  await expect(page).toHaveURL('/login?next=%2Ftransactions');
  await expect(page.locator('.app-shell')).toHaveCount(0);
  expect(exchanges).toBe(hasVerifier ? 1 : 0);
  expect(await page.locator('body').innerText()).not.toContain('PRIVATE_');
});

test('a failed recovery link preserves an existing verified session without stranding navigation', async ({ page }) => {
  await challenge(page);
  await mockSignedInApp(page);
  await page.goto('/?code=PRIVATE_EXPIRED_CODE&recovery=1&next=%2Ftransactions');
  await expect(page).toHaveURL('/transactions');
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set a new password' })).toHaveCount(0);
});

for (const locale of ['en', 'ms']) test(`configured security check fits 320px reflow in ${locale}`, async ({ page }) => {
  await challenge(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript(language => localStorage.setItem('prism-preferences', JSON.stringify({ state: { locale: language }, version: 1 })), locale);
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Complete synthetic security check' })).toBeVisible();
  const widget = page.locator('[data-widget-language]');
  await expect(widget).toHaveAttribute('data-widget-language', locale);
  expect((await widget.boundingBox())?.width).toBe(150);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
for (const locale of ['en', 'ms'] as const) test(`signup requires a fresh token, preserves confirmation and clears consumed tokens in ${locale}`, async ({ page }) => {
  await challenge(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript(language => localStorage.setItem('prism-preferences', JSON.stringify({ state: { locale: language }, version: 1 })), locale);
  const captchaHelp = locale === 'ms' ? 'Lengkapkan semakan keselamatan sebelum meneruskan.' : 'Complete the security check before continuing.';
  const confirmationText = locale === 'ms' ? 'Semak peti masuk dan folder spam untuk mengesahkan akaun, kemudian log masuk.' : 'Check your inbox and spam folder to confirm your account, then sign in.';
  const requests: Record<string, unknown>[] = [];
  await page.route(supabaseUrl + '/auth/v1/signup*', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { id: 'synthetic-unconfirmed', identities: [] } });
  });
  await page.goto('/login?mode=signup');
  await page.getByLabel(locale === 'ms' ? 'Nama anda' : 'Your name', { exact: true }).fill('Synthetic member');
  await fillLogin(page, locale);
  const submit = page.locator('form').getByRole('button', { name: locale === 'ms' ? 'Cipta akaun' : 'Create account', exact: true });
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText(captchaHelp);
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Complete synthetic security check' }).click();
  await page.getByRole('button', { name: 'Expire synthetic security check' }).click();
  await submit.click(); expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Complete synthetic security check' }).click();
  await submit.click();
  await expect(page.getByRole('status').filter({ hasText: confirmationText })).toHaveText(confirmationText);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(requests).toHaveLength(1);
  expect(requests[0].gotrue_meta_security).toMatchObject({ captcha_token: expect.stringMatching(/^fixture-token-/) });
  await expect(page.locator('.app-shell')).toHaveCount(0);
  await expect(page.getByLabel(locale === 'ms' ? 'Kata laluan' : 'Password', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: locale === 'ms' ? 'Hantar semula e-mel pengesahan' : 'Resend confirmation email' }).click();
  await expect(page.getByRole('alert')).toHaveText(captchaHelp);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('fixture-token-');
});
test('sign-in consumes tokens even when Auth rejects the request', async ({ page }) => {
  await challenge(page);
  const requests: Record<string, unknown>[] = [];
  await page.route(supabaseUrl + '/auth/v1/token*', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ status: 400, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'X-Supabase-Api-Version' }, json: { code: 'invalid_credentials', msg: 'PRIVATE_PROVIDER_DETAIL' } });
  });
  await page.goto('/login'); await fillLogin(page);
  await page.getByRole('button', { name: 'Complete synthetic security check' }).click();
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
  expect(requests[0].gotrue_meta_security).toMatchObject({ captcha_token: expect.stringMatching(/^fixture-token-/) });
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Complete the security check');
  expect(requests).toHaveLength(1);
});
test('resend and password recovery include fresh tokens and safe redirects', async ({ page }) => {
  await challenge(page);
  const requests: { path: string; body: Record<string, unknown>; redirect: string | null }[] = [];
  await page.route(supabaseUrl + '/auth/v1/**', route => {
    const url = new URL(route.request().url());
    requests.push({ path: url.pathname, body: route.request().postDataJSON(), redirect: url.searchParams.get('redirect_to') });
    return route.fulfill({ json: {} });
  });
  await page.goto('/login?next=https://attacker.invalid/');
  await page.getByLabel('Email address', { exact: true }).fill('new-prism-fixture@example.invalid');
  await page.getByRole('button', { name: 'Complete synthetic security check' }).click();
  await page.getByRole('button', { name: 'Resend confirmation email' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'If this address needs confirmation' })).toBeVisible();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email address', { exact: true }).fill('new-prism-fixture@example.invalid');
  await page.getByRole('button', { name: 'Send recovery email' }).click();
  await expect(page.getByRole('alert')).toContainText('Complete the security check');
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: 'Complete synthetic security check' }).click();
  await page.getByRole('button', { name: 'Send recovery email' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'If an account exists' })).toBeVisible();
  expect(requests.map(r => r.path)).toEqual(['/auth/v1/resend', '/auth/v1/recover']);
  for (const request of requests) {
    expect(request.body.gotrue_meta_security).toMatchObject({ captcha_token: expect.stringMatching(/^fixture-token-/) });
    expect(new URL(request.redirect!).origin).toBe('http://127.0.0.1:5173');
  }
  expect(new URL(requests[0].redirect!).searchParams.get('next')).toBe('/dashboard');
});
test('failed script has accessible retry, fails closed, and recovers without reload', async ({ page }) => {
  await challenge(page, true);
  let authRequests = 0;
  await page.route(supabaseUrl + '/auth/v1/**', route => { authRequests++; return route.fulfill({ json: {} }); });
  await page.goto('/login'); await fillLogin(page);
  await expect(page.getByRole('button', { name: 'Retry security check' })).toBeVisible();
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Complete the security check');
  expect(authRequests).toBe(0);
  await challenge(page);
  await page.getByRole('button', { name: 'Retry security check' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Complete synthetic security check' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
for (const locale of ['en', 'ms']) test(`invalid callback and server shutdown are safe in ${locale}`, async ({ page }) => {
  await challenge(page);
  await page.addInitScript(language => localStorage.setItem('prism-preferences', JSON.stringify({ state: { locale: language }, version: 1 })), locale);
  await page.route(supabaseUrl + '/auth/v1/signup*', route => route.fulfill({ status: 422, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'X-Supabase-Api-Version' }, json: { code: 'signup_disabled', msg: 'PRIVATE_PROVIDER_DETAIL' } }));
  await page.goto('/?error=access_denied&error_code=otp_expired&error_description=PRIVATE_CALLBACK&code=PRIVATE_CODE&refresh_token=PRIVATE_REFRESH#access_token=PRIVATE_TOKEN');
  await expect(page.getByRole('alert')).toHaveText(locale === 'ms' ? 'Pautan akaun ini tidak sah atau telah tamat tempoh. Minta e-mel pengesahan atau pemulihan kata laluan baharu.' : 'This account link is invalid or has expired. Request a new confirmation or password recovery email.');
  await expect(page).toHaveURL('/login');
  await page.getByRole('combobox').filter({ has: page.locator('option[value="ms"]') }).selectOption(locale);
  const ms = locale === 'ms';
  await page.getByRole('group', { name: ms ? 'Cara log masuk' : 'Authentication mode' }).getByRole('button', { name: ms ? 'Cipta akaun' : 'Create account' }).click();
  await page.getByLabel(ms ? 'Nama anda' : 'Your name', { exact: true }).fill('Synthetic member');
  await page.getByLabel(ms ? 'Alamat e-mel' : 'Email address', { exact: true }).fill('new-prism-fixture@example.invalid');
  await page.getByLabel(ms ? 'Kata laluan' : 'Password', { exact: true }).fill('SyntheticStrongPassword123');
  await page.getByRole('button', { name: 'Complete synthetic security check' }).click();
  await page.locator('form').getByRole('button', { name: ms ? 'Cipta akaun' : 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(ms ? 'Ahli sedia ada masih boleh log masuk' : 'Existing members can still sign in');
});

for (const locale of ['en', 'ms']) test(`mandatory mailbox setup consumes fresh CAPTCHA tokens (${locale})`, async ({ page }) => {
  await mockSignedInApp(page);
  await challenge(page);
  await page.addInitScript(language => localStorage.setItem('prism-preferences', JSON.stringify({ state: { locale: language }, version: 1 })), locale);
  await page.route(supabaseUrl + '/rest/v1/rpc/financial_access_status', route => route.fulfill({ json: { ...readySecurityStatus, allowed: false, reason: 'needs_approval', approvedFactorIds: [], mailboxVerified: false, activated: false } }));
  const requests: Record<string, unknown>[] = [];
  await page.route(supabaseUrl + '/auth/v1/otp*', route => {
    requests.push(route.request().postDataJSON());
    return requests.length === 1 ? route.fulfill({ status: 503, json: { message: 'Synthetic mail service unavailable' } }) : route.fulfill({ json: {} });
  });
  await page.goto('/accounts');
  const send = page.getByRole('button', { name: locale === 'en' ? 'Send secure verification link' : 'Hantar pautan pengesahan selamat', exact: true });
  await expect(send).toBeDisabled();
  await page.getByRole('button', { name: 'Complete synthetic security check' }).click();
  await send.press('Enter');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(send).toBeDisabled();
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: 'Complete synthetic security check' }).click();
  await send.press('Enter');
  await expect(page.getByRole('status')).toBeVisible();
  await expect(send).toBeDisabled();
  expect(requests).toHaveLength(2);
  for (const request of requests) {
    expect(request.create_user).toBe(false);
    expect(request.gotrue_meta_security).toMatchObject({ captcha_token: expect.stringMatching(/^fixture-token-/) });
  }
  await expect(page.locator('.app-shell')).toHaveCount(0);
});

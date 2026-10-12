import { expect, test } from '@playwright/test';
import {authStorageKey, mockSignedInApp, supabaseUrl} from './fixtures';

test('authentication guard protects workspace routes and sign-in UI is keyboard operable', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const route of ['/login', '/transactions', '/categories', '/payments', '/settings', '/notes', '/reminders', '/notifications', '/calendar']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: /your money\. a clearer picture\./i })).toBeVisible();
  }
  await page.getByRole('button', { name: /create account/i }).press('Enter');
  await expect(page.getByLabel(/your name/i)).toBeVisible();
  await page.getByLabel(/email address/i).fill('not-an-email');
  await page.getByLabel(/^password$/i).fill('short');
  await page.getByRole('button', { name: /create account/i }).last().click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const locale of ['en', 'ms'] as const) test(`forgot-password entry requests recovery with the app redirect and complete ${locale} feedback`, async ({ page }) => {
  await page.addInitScript(language => localStorage.setItem('prism-preferences', JSON.stringify({ state: { locale: language }, version: 1 })), locale);
  const requests: { body: Record<string, unknown>; endpoint: string }[] = [];
  await page.route(supabaseUrl + '/auth/v1/recover*', async route => {
    requests.push({ body: route.request().postDataJSON(), endpoint: route.request().url() });
    await route.fulfill({ json: {} });
  });
  await page.goto('/login');
  const expectedRedirect = `${new URL(page.url()).origin}/?recovery=1`;
  await page.getByRole('button', { name: locale === 'ms' ? 'Lupa kata laluan?' : 'Forgot password?', exact: true }).click();
  await page.getByLabel(locale === 'ms' ? 'Alamat e-mel' : 'Email address', { exact: true }).fill('prism-test@example.invalid');
  await page.getByRole('button', { name: locale === 'ms' ? 'Hantar e-mel pemulihan' : 'Send recovery email', exact: true }).click();
  const notice = locale === 'ms'
    ? 'Jika akaun wujud, e-mel pemulihan telah diminta. Semak peti masuk dan folder spam anda.'
    : 'If an account exists, a recovery email has been requested. Check your inbox and spam folder.';
  await expect(page.getByRole('status').filter({ hasText: notice })).toHaveText(notice);
  expect(requests).toHaveLength(1);
  expect(requests[0].body.email).toBe('prism-test@example.invalid');
  const endpoint = new URL(requests[0].endpoint);
  expect(endpoint.origin).toBe(supabaseUrl);
  expect(endpoint.pathname).toBe('/auth/v1/recover');
  expect(endpoint.searchParams.get('redirect_to')).toBe(expectedRedirect);
});

test('PKCE recovery redirects to a new-password form and signs out after updating',async({page})=>{
 await mockSignedInApp(page);await page.addInitScript(storageKey=>{localStorage.removeItem(storageKey);localStorage.setItem(storageKey+'-code-verifier',JSON.stringify('fixture-verifier/recovery'));},authStorageKey);
 let password='';page.on('request',request=>{if(request.method()==='PUT'&&request.url().endsWith('/auth/v1/user'))password=request.postDataJSON().password;});
 await page.goto('/?code=fixture-recovery&recovery=1');await expect(page.getByRole('heading',{name:'Set a new password'})).toBeVisible();await page.getByLabel('New password',{exact:true}).fill('NewPassword123');await page.getByLabel('Confirm password').fill('NewPassword123');await page.getByRole('button',{name:'Update password'}).click();await expect(page.getByRole('heading',{name:'Your money. A clearer picture.'})).toBeVisible();await expect(page.getByRole('status')).toContainText('Password updated. Sign in with your new password.');await expect(page).toHaveURL(/\/login\?next=%2Fdashboard&notice=password-updated$/);expect(password).toBe('NewPassword123');await expect(page.locator('.app-nav')).toHaveCount(0);
});

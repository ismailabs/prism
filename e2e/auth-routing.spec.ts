import { expect, test } from '@playwright/test';
import {authStorageKey, mockSignedInApp, supabaseUrl} from './fixtures';

test('authentication guard protects workspace routes and sign-in UI is keyboard operable', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const route of ['/login', '/transactions', '/categories', '/payments', '/settings']) {
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

test('forgot-password entry sends a recovery request with the app redirect',async({page})=>{
 let body:Record<string,unknown>|undefined;let endpoint='';
 await page.route(supabaseUrl+'/auth/v1/recover*',async route=>{body=route.request().postDataJSON();endpoint=route.request().url();await route.fulfill({json:{}});});
 await page.goto('/login');await page.getByRole('button',{name:'Forgot password?'}).click();await page.getByLabel('Email address').fill('prism-test@example.invalid');await page.getByRole('button',{name:'Send recovery email'}).click();await expect(page.getByRole('status').filter({hasText:'recovery email has been sent'})).toBeVisible();expect(body?.email).toBe('prism-test@example.invalid');expect(decodeURIComponent(endpoint)).toContain('/?recovery=1');
});

test('PKCE recovery redirects to a new-password form and signs out after updating',async({page})=>{
 await mockSignedInApp(page);await page.addInitScript(storageKey=>{localStorage.removeItem(storageKey);localStorage.setItem(storageKey+'-code-verifier',JSON.stringify('fixture-verifier/recovery'));},authStorageKey);
 let password='';page.on('request',request=>{if(request.method()==='PUT'&&request.url().endsWith('/auth/v1/user'))password=request.postDataJSON().password;});
 await page.goto('/?code=fixture-recovery&recovery=1');await expect(page.getByRole('heading',{name:'Set a new password'})).toBeVisible();await page.getByLabel('New password',{exact:true}).fill('NewPassword123');await page.getByLabel('Confirm password').fill('NewPassword123');await page.getByRole('button',{name:'Update password'}).click();await expect(page.getByRole('heading',{name:'Your money. A clearer picture.'})).toBeVisible();await expect(page.getByRole('status')).toContainText('Password updated. Sign in with your new password.');await expect(page).toHaveURL(/\/login\?next=%2Fdashboard&notice=password-updated$/);expect(password).toBe('NewPassword123');await expect(page.locator('.app-nav')).toHaveCount(0);
});

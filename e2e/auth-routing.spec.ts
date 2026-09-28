import { expect, test } from '@playwright/test';

test('authentication guard protects workspace routes and sign-in UI is keyboard operable', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const route of ['/', '/transactions', '/categories', '/payments', '/settings']) {
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

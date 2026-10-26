import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSignedInApp } from './fixtures';

for (const locale of ['en', 'ms'] as const) {
  test(`public policies are readable before signup with safe contact and no financial reads (${locale})`, async ({ page }) => {
    await page.addInitScript(language => localStorage.setItem('prism-preferences', JSON.stringify({ state: { locale: language }, version: 1 })), locale);
    const privateReads: string[] = [];
    page.on('request', request => { if (request.url().includes('/rest/v1/')) privateReads.push(request.url()); });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/privacy');
    const privacy = locale === 'ms' ? 'Notis privasi' : 'Privacy notice';
    const terms = locale === 'ms' ? 'Syarat penggunaan' : 'Terms of use';
    await expect(page.getByRole('heading', { name: privacy, exact: true })).toBeVisible();
    await expect(page).toHaveTitle(`PRISM · ${privacy}`);
    await expect(page.getByText(locale === 'ms' ? 'PRISM dikendalikan oleh Ismail di Malaysia.' : 'PRISM is operated by Ismail in Malaysia.', { exact: true })).toBeVisible();
    const contact = page.getByRole('link', { name: locale === 'ms' ? 'Hubungi Ismail' : 'Contact Ismail', exact: true });
    await expect(contact).toHaveAttribute('href', 'https://www.ismailstudio.my/#contact');
    await expect(contact).toHaveAttribute('rel', 'noreferrer');
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.locator('#policy-main')).toContainText(locale === 'ms' ? 'tidak menjanjikan penghapusan segera' : 'does not promise immediate erasure');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('contentinfo').getByRole('link', { name: terms, exact: true }).press('Enter');
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { name: terms, exact: true })).toBeVisible();
    await expect(page.locator('#policy-main')).toContainText(locale === 'ms' ? 'bukan nasihat kewangan' : 'not financial advice');
    expect(privateReads).toEqual([]);
    await page.goto('/login?mode=signup');
    await page.getByRole('link', { name: privacy, exact: true }).click();
    await expect(page.getByRole('heading', { name: privacy, exact: true })).toBeVisible();
  });
}

test('signed-in visitors can read policies without loading private financial tables', async ({ page }) => {
  await mockSignedInApp(page);
  const privateReads: string[] = [];
  page.on('request', request => { if (request.url().includes('/rest/v1/')) privateReads.push(request.url()); });
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy notice', exact: true })).toBeVisible();
  await expect(page.locator('.app-nav')).toHaveCount(0);
  await page.getByLabel('Language', { exact: true }).selectOption('ms');
  await expect(page.getByRole('heading', { name: 'Notis privasi', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
  expect(privateReads).toEqual([]);
});

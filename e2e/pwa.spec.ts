import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSignedInApp, supabaseUrl, authStorageKey } from './fixtures';
import { mkdir, writeFile } from 'node:fs/promises';
async function controlled(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}
async function cacheInventory(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const inventory: { name: string; urls: string[]; leaked: boolean }[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name), keys = await cache.keys();
      let leaked = false;
      for (const key of keys) if ((await (await cache.match(key))!.text()).includes('PRIVATE_FIXTURE_NOT_FOR_CACHE')) leaked = true;
      inventory.push({ name, urls: keys.map(key => new URL(key.url).pathname), leaked });
    }
    return inventory;
  });
}
test('real worker installation, manifest, network-only finance and offline restart', async ({ page, context }) => {
  await controlled(page);
  const manifest = await (await context.request.get('/site.webmanifest')).json();
  expect(manifest).toMatchObject({ id: '/', scope: '/', start_url: '/', display: 'standalone' });
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512']);
  for (const icon of manifest.icons) { const response = await context.request.get(icon.src); expect(response.status()).toBe(200); expect(response.headers()['content-type']).toBe('image/png'); }
  await page.evaluate(async () => { for (const path of ['/api/private', '/exports/transactions.csv', '/search?q=PRIVATE_FIXTURE_NOT_FOR_CACHE']) await fetch(path); });
  const built = await (await context.request.get('/pwa-build.json')).json();
  const inventory = await cacheInventory(page);
  expect(inventory).toHaveLength(1); expect(inventory[0].urls.sort()).toEqual(built.assets.sort()); expect(inventory[0].leaked).toBe(false);
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([]);
  const before = await context.request.get('/dashboard'); expect(before.headers()['cache-control']).toBe('no-store');
  const sw = await context.request.get('/sw.js'); expect(sw.headers()['cache-control']).toContain('must-revalidate'); expect(sw.headers()['content-security-policy']).toContain("worker-src 'self'");
  expect((await context.request.get('/assets/missing.js')).status()).toBe(404);
  await context.setOffline(true); await page.goto('/accounts');
  await expect(page.getByRole('heading', { name: 'You are offline', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Anda di luar talian', exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain('PRIVATE_FIXTURE_NOT_FOR_CACHE');
  const restarted = await context.newPage(); await restarted.goto('/transactions');
  await expect(restarted.getByRole('heading', { name: 'You are offline', exact: true })).toBeVisible();
  await context.setOffline(false); await page.getByRole('link', { name: 'Try again / Cuba lagi' }).click();
  await expect(page.getByRole('heading', { name: 'Life has many sides. See your money clearly.' })).toBeVisible();
  await mkdir('artifacts/phase7', { recursive: true }); await writeFile('artifacts/phase7/pwa-cache-inventory.json', JSON.stringify({ manifest, inventory, restart: 'PASS', connectionRecovery: 'PASS' }, null, 2));
});
test('update waits for acceptance, replaces only public caches and reloads the accepting tab', async ({ page, context }) => {
  await controlled(page); const previous = (await cacheInventory(page))[0].name;
  await page.evaluate(async () => { await caches.open('unrelated-public-cache'); });
  const other = await context.newPage(); await other.goto('/demo');
  await context.request.post('/__pwa_test/update');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
  const notice = page.getByRole('region', { name: 'Install and updates', exact: true });
  await expect(notice.getByRole('button', { name: 'Update and reload' })).toBeVisible();
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())!.waiting))).toBe(true);
  await Promise.all([page.waitForEvent('load'), notice.getByRole('button', { name: 'Update and reload' }).click()]);
  await expect.poll(async () => (await cacheInventory(page)).some(cache => cache.name === previous)).toBe(false);
  expect((await cacheInventory(page)).some(cache => cache.name === 'unrelated-public-cache')).toBe(true);
  expect(new URL(other.url()).pathname).toBe('/demo');
});
test('private screen hides offline, reconnects with fresh owned reads and retains no finance caches', async ({ page, context }) => {
  await mockSignedInApp(page); await page.goto('/accounts');
  await expect(page.getByText('Everyday account', { exact: true })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await expect(page.getByRole('heading', { name: 'You are offline', exact: true })).toBeVisible();
  await expect(page.getByText('Everyday account', { exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('ms');
  await expect(page.getByRole('heading', { name: 'Anda di luar talian', exact: true })).toBeVisible();
  const ownedRead = page.waitForResponse(response => response.url().startsWith(supabaseUrl + '/rest/v1/exact_accounts') && response.status() === 200);
  await context.setOffline(false); await ownedRead;
  await expect(page.getByText('Everyday account', { exact: true })).toBeVisible();
  const inventory = await cacheInventory(page); expect(inventory.every(cache => cache.urls.every(url => url.startsWith('/assets/') || url.startsWith('/offline-')))).toBe(true);
  await page.getByRole('button', { name: /^(Sign out|Log keluar)$/ }).click();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), authStorageKey)).toBe(null);
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([]);
  expect((await cacheInventory(page)).every(cache => !cache.leaked)).toBe(true);
});
test('an accepted update cannot reload a pending financial save', async ({ page, context }) => {
  await mockSignedInApp(page); await controlled(page); await page.goto('/accounts');
  await expect(page.getByText('Everyday account', { exact: true })).toBeVisible();
  await context.request.post('/__pwa_test/update'); await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
  const notice = page.getByRole('region', { name: 'Install and updates', exact: true });
  await expect(notice.getByRole('button', { name: 'Update and reload' })).toBeVisible();
  let resume!: () => void; const held = new Promise<void>(resolve => resume = resolve);
  await page.route(supabaseUrl + '/rest/v1/accounts*', async route => { if (route.request().method() === 'POST') { await held; await route.fallback(); } else await route.fallback(); });
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  const form = page.getByRole('dialog'); await form.getByLabel('Account name').fill('Pending save fixture');
  const sent = page.waitForRequest(request => request.url().includes('/rest/v1/accounts') && request.method() === 'POST');
  await form.getByRole('button', { name: 'Save account', exact: true }).click(); await sent;
  // The open modal correctly hides background controls from accessibility.
  const background = page.getByRole('region', { name: 'Install and updates', exact: true, includeHidden: true });
  await expect(background.getByRole('button', { name: 'Saving…', exact: true, includeHidden: true })).toBeDisabled();
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())!.waiting))).toBe(true);
  resume(); await expect(form).toHaveCount(0); await expect(notice.getByRole('button', { name: 'Update and reload' })).toBeEnabled();
});
test('bilingual offline fallback reflows with keyboard and axe in both themes', async ({ page, context }) => {
  await controlled(page); await context.setOffline(true); await page.goto('/settings');
  for (const colorScheme of ['light', 'dark'] as const) for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width, height: 480 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('link', { name: 'Try again / Cuba lagi' }).focus(); await expect(page.getByRole('link')).toBeFocused();
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(audit.violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/phase7/offline-bilingual.png', fullPage: true });
});

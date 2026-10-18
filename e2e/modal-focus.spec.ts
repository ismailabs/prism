import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'vite';
import { createServer, type Server } from 'node:http';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { mockSignedInApp, rows, supabaseUrl } from './fixtures';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const hostname = new URL(route.request().url()).hostname;
    return ['127.0.0.1', 'localhost'].includes(hostname) ? route.continue() : route.abort('blockedbyclient');
  });
});

for (const locale of ['en', 'ms']) for (const theme of ['light', 'dark']) {
  test(`deletion modal keyboard, confirmation and restoration ${locale}/${theme}`, async ({ page }) => {
    await mockSignedInApp(page);
    Object.assign(rows.profiles[0], { language: locale, theme });
    let writes = 0;
    page.on('request', request => {
      if ((request.url().startsWith(supabaseUrl + '/rest/v1/') && !request.url().endsWith('/rpc/financial_access_status')) && ['POST', 'PATCH', 'DELETE'].includes(request.method())) writes++;
    });
    await page.goto('/settings');
    const opener = page.getByRole('button', { name: locale === 'ms' ? 'Padam akaun Prism' : 'Delete Prism account', exact: true });
    await opener.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAccessibleName(locale === 'ms' ? 'Padam akaun Prism secara kekal' : 'Permanently delete your Prism account');
    const confirmation = dialog.getByLabel(/DELETE test@example.com/);
    const danger = dialog.getByRole('button', { name: locale === 'ms' ? 'Padam selama-lamanya' : 'Delete forever', exact: true });
    await confirmation.fill('DELETE');
    await expect(danger).toBeDisabled();
    await confirmation.fill('DELETE test@example.com');
    await expect(danger).toBeEnabled();
    for (const key of ['Tab', 'Shift+Tab']) for (let i = 0; i < 8; i++) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    for (const name of [locale === 'ms' ? 'Batal' : 'Cancel', locale === 'ms' ? 'Tutup' : 'Close', 'outside']) {
      await page.keyboard.press('Enter');
      if (name === 'outside') await page.locator('.modal-overlay').click({ position: { x: 4, y: 4 } });
      else await dialog.getByRole('button', { name, exact: true }).press('Enter');
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
    }
    expect(writes).toBe(0);
  });

  test(`Add account restores focus for every dismissal ${locale}/${theme}`, async ({ page }) => {
    await mockSignedInApp(page);
    Object.assign(rows.profiles[0], { language: locale, theme });
    let writes = 0;
    page.on('request', request => {
      if ((request.url().startsWith(supabaseUrl + '/rest/v1/') && !request.url().endsWith('/rpc/financial_access_status')) && ['POST', 'PATCH', 'DELETE'].includes(request.method())) writes++;
    });
    await page.goto('/accounts');
    await expect(page.getByText('Everyday account', { exact: true })).toBeVisible();
    const original = JSON.stringify(rows.accounts);
    const opener = page.getByRole('button', { name: locale === 'ms' ? 'Tambah akaun' : 'Add account', exact: true });
    await opener.focus();
    const dialog = page.getByRole('dialog');
    for (const dismissal of ['escape', 'cancel', 'close', 'outside']) {
      await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      if (dismissal === 'escape') {
        const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        expect(audit.violations).toEqual([]);
        await page.keyboard.press('Escape');
      } else if (dismissal === 'outside') {
        await page.locator('.modal-overlay').click({ position: { x: 4, y: 4 } });
      } else {
        const name = dismissal === 'cancel' ? (locale === 'ms' ? 'Batal' : 'Cancel') : (locale === 'ms' ? 'Tutup' : 'Close');
        await dialog.getByRole('button', { name, exact: true }).press('Enter');
      }
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
    }
    expect(JSON.stringify(rows.accounts)).toBe(original);
    expect(writes).toBe(0);
  });
}

for (const locale of ['en', 'ms']) {
  test(`autofocused transaction field retains its opening control ${locale}`, async ({ page }) => {
    await mockSignedInApp(page);
    rows.profiles[0].language = locale;
    const original = JSON.stringify(rows.transactions);
    await page.goto('/transactions');
    const opener = page.getByRole('button', { name: locale === 'ms' ? 'Tambah transaksi' : 'Add transaction', exact: true });
    await expect(opener).toBeEnabled();
    await opener.focus();
    for (const dismissal of ['escape', 'cancel', 'close']) {
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByLabel(locale === 'ms' ? 'Amaun' : 'Amount', { exact: true })).toBeFocused();
      if (dismissal === 'escape') await page.keyboard.press('Escape');
      else await dialog.getByRole('button', { name: dismissal === 'cancel' ? (locale === 'ms' ? 'Batal' : 'Cancel') : (locale === 'ms' ? 'Tutup' : 'Close'), exact: true }).press('Enter');
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
    }
    expect(JSON.stringify(rows.transactions)).toBe(original);
  });

  test(`pending account deletion keeps its existing dismissal guards ${locale}`, async ({ page }) => {
    await mockSignedInApp(page);
    rows.profiles[0].language = locale;
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route(supabaseUrl + '/rest/v1/rpc/delete_own_account', async route => {
      await pending;
      await route.fulfill({ status: 403, json: { code: '42501', message: 'Synthetic denial' } });
    });
    await page.goto('/settings');
    await page.getByRole('button', { name: locale === 'ms' ? 'Padam akaun Prism' : 'Delete Prism account', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/DELETE test@example.com/).fill('DELETE test@example.com');
    const request = page.waitForRequest(request => request.url().endsWith('/rest/v1/rpc/delete_own_account'));
    await dialog.getByRole('button', { name: locale === 'ms' ? 'Padam selama-lamanya' : 'Delete forever', exact: true }).press('Enter');
    await request;
    await expect(dialog.getByRole('button', { name: locale === 'ms' ? 'Batal' : 'Cancel', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: locale === 'ms' ? 'Tutup' : 'Close', exact: true }).press('Enter');
    await expect(dialog).toBeVisible();
    await page.locator('.modal-overlay').click({ position: { x: 4, y: 4 } });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    release();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await dialog.getByRole('button', { name: locale === 'ms' ? 'Batal' : 'Cancel', exact: true }).press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: locale === 'ms' ? 'Padam akaun Prism' : 'Delete Prism account', exact: true })).toBeFocused();
  });
}

test.describe('shared modal lifecycle', () => {
  let server: Server;
  test.beforeAll(async () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    // Build before browser navigation: cold dev module graphs can time out
    // under load. Keep the same production component and all assertions.
    const output = await build({
      configFile: false, root, plugins: [react()], logLevel: 'warn',
      build: { write: false, minify: false, cssCodeSplit: false,
        rolldownOptions: { input: root + 'e2e/fixtures/modal-focus.tsx',
          output: { entryFileNames: 'fixture.js' } },
      },
    });
    if (Array.isArray(output) || !('output' in output)) throw new Error('Expected one fixture bundle');
    const assets = new Map(output.output.map(asset => [asset.fileName,
      asset.type === 'chunk' ? asset.code : asset.source]));
    const styles = [...assets.keys()].filter(name => name.endsWith('.css'));
    const html = '<!doctype html><html lang="en"><head><title>Modal focus fixture</title>' +
      styles.map(name => '<link rel="stylesheet" href="/' + name + '">').join('') +
      '</head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>';
    server = createServer((request, response) => {
      const pathname = new URL(request.url ?? '/', 'http://127.0.0.1:5195').pathname;
      const asset = assets.get(pathname.slice(1));
      if (pathname === '/__modal_focus') {
        response.setHeader('Content-Type', 'text/html'); response.end(html);
      } else if (asset !== undefined) {
        response.setHeader('Content-Type', pathname.endsWith('.css') ? 'text/css' : 'text/javascript');
        response.end(asset);
      } else { response.statusCode = 404; response.end(); }
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject); server.listen(5195, '127.0.0.1', resolve);
    });
  });
  test.afterAll(async () => { if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5195/__modal_focus');
    await page.getByRole('button', { name: 'Open modal', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('textbox', { name: 'First field', exact: true })).toBeFocused();
    // Synchronize with the library's deferred close event, rather than sleeping
    // or asserting before the callback that might steal focus has executed.
    await page.getByRole('dialog', { name: 'Keyboard modal', exact: true }).evaluate(element => {
      element.addEventListener('focusScope.autoFocusOnUnmount', () => { document.documentElement.dataset.modalCloseObserved = 'true'; }, { once: true });
    });
  });

  async function closed(page: Page) {
    await expect(page.locator('html')).toHaveAttribute('data-modal-close-observed', 'true');
  }

  for (const kind of ['removed', 'disabled', 'hidden', 'visibility', 'inert', 'aria-hidden', 'aria-disabled', 'opacity', 'content-visibility']) {
    test(`unavailable opener: ${kind}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.evaluate(kind => window.modalFocus.unavailable(kind), kind);
      await page.keyboard.press('Escape');
      await closed(page);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('main')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();
      await expect(page.getByRole('main')).not.toHaveAttribute('tabindex');
      expect(errors).toEqual([]);
    });
  }

  test('programmatic close restores a surviving opener', async ({ page }) => {
    await page.evaluate(() => window.modalFocus.close());
    await closed(page);
    await expect(page.getByRole('button', { name: 'Open modal', exact: true })).toBeFocused();
  });
  test('unmount leaves an explicit newer focus choice intact', async ({ page }) => {
    await page.evaluate(() => {
      window.modalFocus.unmount();
      const next = [...document.querySelectorAll('button')].find(button => button.textContent === 'Continue');
      next?.focus();
    });
    await closed(page);
    await expect(page.getByRole('button', { name: 'Open modal', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();
  });
  test('asynchronous close respects an explicit newer focus choice', async ({ page }) => {
    await page.evaluate(() => Promise.resolve().then(() => window.modalFocus.closeAndFocus()));
    await closed(page);
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();
  });
  test('a new initially-open modal restores its opener after child autofocus', async ({ page }) => {
    await page.evaluate(() => window.modalFocus.unmount());
    await closed(page);
    const opener = page.getByRole('button', { name: 'Open modal', exact: true });
    await opener.focus();
    await page.evaluate(() => window.modalFocus.remountAutofocused());
    await expect(page.getByRole('textbox', { name: 'First field', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
  test('rapid reopen cannot restore focus from the old session', async ({ page }) => {
    await page.evaluate(() => window.modalFocus.reopen());
    await closed(page);
    await expect(page.getByRole('textbox', { name: 'First field', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open modal', exact: true })).toBeFocused();
  });
  test('replacement dialog keeps its keyboard focus', async ({ page }) => {
    await page.evaluate(() => window.modalFocus.replace());
    await closed(page);
    await expect(page.getByRole('dialog', { name: 'Keyboard modal', exact: true })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Replacement field', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.getByRole('dialog', { name: 'Replacement modal', exact: true }).evaluate(element => element.contains(document.activeElement))).toBe(true);
  });
  test('nested dismissal returns to its control inside the still-open parent', async ({ page }) => {
    const opener = page.getByRole('button', { name: 'Open nested modal', exact: true });
    await opener.press('Enter');
    await expect(page.getByRole('textbox', { name: 'Nested field', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Nested modal', exact: true })).toHaveCount(0);
    await expect(opener).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open modal', exact: true })).toBeFocused();
  });
  test('removed nested opener falls back inside its still-open parent', async ({ page }) => {
    await page.getByRole('button', { name: 'Open nested modal', exact: true }).press('Enter');
    await expect(page.getByRole('textbox', { name: 'Nested field', exact: true })).toBeFocused();
    await page.evaluate(() => window.modalFocus.unavailable('nested-removed'));
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Nested modal', exact: true })).toHaveCount(0);
    const parent = page.getByRole('dialog', { name: 'Keyboard modal', exact: true });
    await expect(parent).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await parent.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open modal', exact: true })).toBeFocused();
  });
});

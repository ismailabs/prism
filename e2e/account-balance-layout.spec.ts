import { expect, test, type Locator } from '@playwright/test';
import { mockSignedInApp, rows, supabaseUrl, userId } from './fixtures';

// Local rendering regression only. All provider responses are synthetic; this
// never substitutes for hosted Auth, finance, device or assistive-tech acceptance.
const cases = [
  { currency: 'MYR', values: ['2840.00', '9999999999999999.99', '-2840.00'], numbers: ['2,840.00', '9,999,999,999,999,999.99', '-2,840.00'] },
  { currency: 'USD', values: ['2840.00', '9999999999999999.99', '-2840.00'], numbers: ['2,840.00', '9,999,999,999,999,999.99', '-2,840.00'] },
  { currency: 'EUR', values: ['2840.00', '9999999999999999.99', '-2840.00'], numbers: ['2,840.00', '9,999,999,999,999,999.99', '-2,840.00'] },
  { currency: 'JPY', values: ['2840', '9999999999999999', '-2840'], numbers: ['2,840', '9,999,999,999,999,999', '-2,840'] },
];

async function expectWholeVisibleAmount(amount: Locator) {
  const geometry = await amount.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const lineRects = [...range.getClientRects()].filter(rect => rect.width > 0);
    const row = element.closest('.row-title')!.getBoundingClientRect();
    const text = range.getBoundingClientRect();
    return {
      lines: new Set(lineRects.map(rect => Math.round(rect.top))).size,
      left: text.left, right: text.right, rowLeft: row.left, rowRight: row.right,
      overflow: element.scrollWidth > element.clientWidth + 1,
    };
  });
  expect(geometry.lines, 'A monetary token must stay on one rendered line').toBe(1);
  expect(geometry.left).toBeGreaterThanOrEqual(geometry.rowLeft - 1);
  expect(geometry.right, 'All monetary digits must fit inside the row').toBeLessThanOrEqual(geometry.rowRight + 1);
  expect(geometry.overflow, 'Amount must not be clipped').toBe(false);
}

for (const [locale, theme] of [['en', 'light'], ['ms', 'dark']] as const) {
  for (const width of [320, 390, 768, 1440]) {
    test(`account balance token stays whole ${locale}/${theme} ${width}`, async ({ page }, testInfo) => {
      await mockSignedInApp(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 1000 });
      Object.assign(rows.profiles[0] as object, { language: locale, theme });
      rows.transactions = [];
      rows.transfers = [];
      const errors: string[] = [], unexpectedHosts: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(testInfo.project.use.baseURL!).origin || url.origin === supabaseUrl) return route.fallback();
        unexpectedHosts.push(url.origin);
        await route.abort();
      });
      await page.route('**/api/rates?*', route => route.fulfill({ json: { base: 'MYR', rates: { MYR: 1, USD: .23, EUR: .21, JPY: 34 }, updatedAt: Date.now(), source: 'Local synthetic rendering fixture' } }));
      await page.route(`${supabaseUrl}/rest/v1/exact_accounts*`, route => route.fulfill({ json: rows.accounts }));
      const accounts = page.locator('.position-section').filter({ has: page.getByRole('heading', { name: locale === 'en' ? 'Your accounts' : 'Akaun anda', exact: true }) });
      const privacy = page.getByRole('button', { name: locale === 'en' ? 'Privacy Mode' : 'Mod Privasi', exact: true });
      const observations: object[] = [];
      for (const scenario of cases) {
        const prefix = locale === 'en' ? 'Synthetic long account context ' : 'Konteks akaun sintetik yang panjang ';
        rows.accounts = scenario.values.map((value, index) => ({
          id: `layout-${scenario.currency}-${index}`, user_id: userId,
          // Match the account form's actual 80-character limit, including an
          // unbroken name; a regression must cover supported user input.
          name: index === 1 ? `UnbrokenSyntheticAccountName${scenario.currency}`.repeat(3).slice(0, 80) : `${prefix.repeat(3).slice(0, 79)}${index}`,
          currency: scenario.currency, opening_balance: value, balance: value,
          archived: false, linked_activity_count: 0, created_at: '',
        }));
        await page.goto('/dashboard');
        // This section waits for six queries. Observe its actual ready state
        // before measuring geometry; do not add sleeps or relax assertions.
        await page.locator('.module-position .position-grid').waitFor();
        await expect(accounts.locator('li.position-row')).toHaveCount(3);
        await page.evaluate(() => document.fonts.ready);
        for (const [index, record] of rows.accounts.entries()) {
          const name = (record as {name: string}).name;
          const row = accounts.locator('li.position-row').filter({ has: page.getByText(name, { exact: true }) });
          const amount = row.locator('strong');
          await expect(row).toHaveCount(1);
          // Explicit decimal-text oracle; do not round a Number or use the
          // product formatter to generate the test's expected monetary digits.
          await expect(amount).toContainText(scenario.numbers[index].replace('-', ''));
          if (scenario.values[index].startsWith('-')) await expect(amount).toContainText('-');
          await expectWholeVisibleAmount(amount);
          expect(await row.locator('.row-title > span').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        }
        await privacy.click();
        for (const amount of await accounts.locator('li.position-row strong').all()) {
          await expect(amount).toHaveText(`${scenario.currency} ••••••`);
          await expectWholeVisibleAmount(amount);
        }
        await privacy.click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        observations.push({ currency: scenario.currency, exactAmounts: scenario.values, renderedAmountCount: 3, privacyRetested: true });
        if (scenario.currency === 'MYR') await page.screenshot({ path: testInfo.outputPath('account-amounts.png'), fullPage: true });
      }
      expect(errors).toEqual([]);
      expect(unexpectedHosts).toEqual([]);
      await testInfo.attach('synthetic-layout-observations', { body: JSON.stringify({ locale, theme, width, observations }), contentType: 'application/json' });
    });
  }
}

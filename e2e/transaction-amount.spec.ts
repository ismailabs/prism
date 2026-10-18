import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockSignedInApp, rows, supabaseUrl } from './fixtures';

const copy = {
  en: {
    add: 'Add transaction', amount: 'Amount', currency: 'Currency', account: 'Account (optional)',
    positive: 'Enter an amount greater than zero.',
    precision: (currency: string) => `${currency} allows 2 decimal places; amounts are never rounded silently.`,
    whole: 'JPY allows 0 decimal places; amounts are never rounded silently.',
    format: 'Use a decimal amount with consistent thousands separators.',
    range: 'Amount exceeds the supported range.',
  },
  ms: {
    add: 'Tambah transaksi', amount: 'Amaun', currency: 'Mata wang', account: 'Akaun (pilihan)',
    positive: 'Masukkan amaun melebihi sifar.',
    precision: (currency: string) => `${currency} membenarkan 2 tempat perpuluhan; amaun tidak dibundarkan secara senyap.`,
    whole: 'JPY membenarkan 0 tempat perpuluhan; amaun tidak dibundarkan secara senyap.',
    format: 'Gunakan amaun perpuluhan dengan pemisah ribu yang konsisten.',
    range: 'Amaun melebihi julat yang disokong.',
  },
};

for (const language of ['en', 'ms'] as const) {
  for (const currency of ['MYR', 'USD', 'EUR', 'JPY'] as const) {
    test(`${language} ${currency}: accurate amount errors, no writes, and exact valid submission`, async ({ page }, testInfo) => {
      await mockSignedInApp(page);
      rows.profiles[0].language = language;
      if (currency === 'MYR') await page.setViewportSize({ width: 320, height: 800 });
      const c = copy[language];
      const writes: { method: string; url: string; body: unknown }[] = [];
      page.on('request', request => {
        if ((request.url().startsWith(supabaseUrl + '/rest/v1/') && !request.url().endsWith('/rpc/financial_access_status')) &&
          ['POST', 'PATCH', 'DELETE'].includes(request.method()) &&
          !request.url().includes('/rpc/transaction_page')) {
          writes.push({ method: request.method(), url: request.url(), body: request.postDataJSON() });
        }
      });
      await page.goto('/transactions');
      const opener = page.getByRole('button', { name: c.add, exact: true });
      await opener.click();
      const form = page.getByRole('dialog');
      const amount = form.getByRole('textbox', { name: c.amount, exact: true });
      await expect(amount).toBeFocused();
      await expect(form.getByRole('combobox', { name: c.account, exact: true }).getByRole('option', { name: 'Everyday account', exact: true })).toHaveCount(1);
      await form.getByRole('combobox', { name: c.currency, exact: true }).selectOption(currency);
      const before = structuredClone(rows);
      const financialUi = page.locator('main .finance-table tbody, main ul[aria-label]');
      const beforeFinancialUi = await financialUi.allTextContents();
      await amount.press('Enter');
      expect(await amount.evaluate(input => (input as HTMLInputElement).validity.valueMissing)).toBe(true);
      await expect(form.getByRole('alert')).toHaveCount(0);
      expect(writes).toEqual([]); expect(rows).toEqual(before);
      const precision = currency === 'JPY' ? c.whole : c.precision(currency);
      const cases = [
        [currency === 'JPY' ? '1.1' : '1.234', precision],
        [currency === 'JPY' ? '1.0' : '1.230', precision],
        [currency === 'JPY' ? '-1.1' : '-1.234', precision],
        ['0', c.positive], ['-1', c.positive], ['-0', c.positive],
        ['abc', c.format], ['1e3', c.format], ['12,34.56', c.format],
        ['10000000000000000', c.range],
      ];
      for (const [value, message] of cases) {
        await amount.fill(value);
        await amount.press('Enter');
        const alert = form.getByRole('alert');
        await expect(alert).toHaveText(message);
        await expect(amount).toHaveValue(value);
        await expect(amount).toHaveAttribute('aria-invalid', 'true');
        await expect(amount).toHaveAccessibleDescription(message);
        const errorId = await amount.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        await expect(alert).toHaveAttribute('id', errorId!);
        await expect(amount).toBeFocused();
        expect(writes).toEqual([]);
        expect(rows).toEqual(before);
        expect(await financialUi.allTextContents()).toEqual(beforeFinancialUi);
      }
      await amount.press('Tab');
      await expect(form.getByRole('combobox', { name: c.currency, exact: true })).toBeFocused();
      await page.keyboard.press('Shift+Tab'); await expect(amount).toBeFocused();
      const submit = form.getByRole('button', { name: c.add, exact: true });
      await submit.click(); await expect(form.getByRole('alert')).toHaveText(c.range);
      await expect(submit).toBeFocused(); expect(writes).toEqual([]); expect(rows).toEqual(before);
      await amount.fill(currency === 'JPY' ? '1.1' : '1.234'); await amount.press('Enter');
      await expect(form.getByRole('alert')).toHaveText(precision);
      const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await mkdir('artifacts/gate4b', { recursive: true });
      const treePath = `artifacts/gate4b/${language}-${currency}-error.txt`;
      const screenshotPath = `artifacts/gate4b/${language}-${currency}-error.png`;
      await writeFile(treePath, await form.ariaSnapshot());
      await form.screenshot({ path: screenshotPath });
      await testInfo.attach('amount-error-accessibility-tree', { path: treePath, contentType: 'text/plain' });
      await testInfo.attach('amount-error', { path: screenshotPath, contentType: 'image/png' });
      // Correcting the value clears its stale error association without moving focus.
      const staleErrorId = await amount.getAttribute('aria-describedby');
      await amount.fill(currency === 'JPY' ? '123' : '1.23');
      await expect(form.getByRole('alert')).toHaveCount(0);
      await expect(amount).not.toHaveAttribute('aria-invalid', 'true');
      const hintId = await amount.getAttribute('aria-describedby');
      expect(hintId).toBeTruthy(); expect(hintId).not.toBe(staleErrorId);
      await expect(form.locator(`[id="${hintId}"]`)).toContainText(currency);
      await expect(form.locator(`[id="${hintId}"]`)).toContainText(language === 'en' ? 'Amounts are saved exactly.' : 'Amaun disimpan tepat.');
      await amount.press('Enter');
      await expect(form).toHaveCount(0);
      expect(writes).toHaveLength(1);
      expect(writes[0]).toMatchObject({ method: 'POST', body: { currency, amount: currency === 'JPY' ? '123' : '1.23' } });
      expect(rows.transactions.at(-1)).toMatchObject({ currency, amount: currency === 'JPY' ? '123' : '1.23' });
      await expect(opener).toBeFocused();
      const exactCases = currency === 'JPY'
        ? [['+1,234', '1234'], ['9007199254740993', '9007199254740993'], ['9999999999999999', '9999999999999999']]
        : [['+1,234.56', '1234.56'], ['90071992547409.93', '90071992547409.93'], ['9999999999999999.99', '9999999999999999.99']];
      for (const [input, exact] of exactCases) {
        await opener.click();
        await form.getByRole('combobox', { name: c.currency, exact: true }).selectOption(currency);
        await amount.fill(input); await amount.press('Enter');
        await expect(form).toHaveCount(0);
        expect(writes.at(-1)).toMatchObject({ method: 'POST', body: { currency, amount: exact } });
        expect(rows.transactions.at(-1)).toMatchObject({ currency, amount: exact });
      }
      expect(writes).toHaveLength(4);
    });
  }

  test(`${language}: edit rejection preserves transaction; currency switch refreshes precision feedback`, async ({ page }) => {
    await mockSignedInApp(page); rows.profiles[0].language = language;
    const c = copy[language];
    await page.goto('/transactions');
    await page.getByRole('button', { name: language === 'en' ? 'Actions: Groceries' : 'Tindakan: Groceries' }).click();
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
    const form = page.getByRole('dialog');
    const amount = form.getByRole('textbox', { name: c.amount, exact: true });
    await expect(form.getByRole('combobox', { name: c.account, exact: true }).getByRole('option', { name: 'Everyday account', exact: true })).toHaveCount(1);
    const before = structuredClone(rows);
    const mutations: string[] = [];
    page.on('request', request => {
      if (request.url().startsWith(supabaseUrl + '/rest/v1/transactions') && ['POST', 'PATCH', 'DELETE'].includes(request.method())) mutations.push(request.method());
    });
    await amount.fill('1.234'); await amount.press('Enter');
    await expect(form.getByRole('alert')).toHaveText(c.precision('MYR'));
    expect(rows).toEqual(before); expect(mutations).toEqual([]);
    await form.getByRole('combobox', { name: c.currency, exact: true }).selectOption('JPY');
    await expect(form.getByRole('alert')).toHaveCount(0);
    await amount.press('Enter');
    await expect(form.getByRole('alert')).toHaveText(c.whole);
    expect(rows).toEqual(before); expect(mutations).toEqual([]);
    await form.getByRole('combobox', { name: c.currency, exact: true }).selectOption('MYR');
    await amount.fill('1.23'); await amount.press('Enter');
    await expect(form).toHaveCount(0);
    expect(mutations).toEqual(['PATCH']);
    expect(rows.transactions[0]).toMatchObject({ amount: '1.23', currency: 'MYR' });
  });
}

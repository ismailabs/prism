import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSignedInApp, rows, supabaseUrl, userId } from './fixtures';
import { mkdir, writeFile } from 'node:fs/promises';

async function seed(page: Page, locale = 'en', theme = 'light') {
  await page.clock.setFixedTime(new Date('2026-10-13T04:00:00Z'));
  await mockSignedInApp(page);
  Object.assign(rows.profiles[0] as object, { username: 'Aina · synthetic QA', language: locale, theme });
  rows.categories = [{ id: 'housing', user_id: userId, name: 'Housing', type: 'expense', color: '#176b58', created_at: '' }, { id: 'food', user_id: userId, name: 'Food', type: 'expense', color: '#84602e', created_at: '' }];
  rows.transactions = [
    { id: 'salary', amount: '5200.00', type: 'income', description: 'October income', category_id: null },
    { id: 'rent', amount: '2200.00', type: 'expense', description: 'Recorded rent', category_id: 'housing' },
    { id: 'food', amount: '860.00', type: 'expense', description: 'Recorded groceries', category_id: 'food' },
  ].map(tx => ({ ...tx, currency: 'MYR', user_id: userId, account_id: 'main', payment_method_id: null, transaction_date: '2026-10-10T04:00:00Z', created_at: '' }));
  rows.accounts = [{ id: 'main', user_id: userId, name: 'Everyday account', opening_balance: '1000.00', currency: 'MYR', archived: false, created_at: '' }, { id: 'reserve', user_id: userId, name: 'Reserve account', opening_balance: '2000.00', currency: 'MYR', archived: false, created_at: '' }];
  rows.transfers = [{ id: 'move', user_id: userId, source_account_id: 'main', destination_account_id: 'reserve', source_currency: 'MYR', destination_currency: 'MYR', source_amount: '200.00', destination_amount: '200.00', occurred_at: '2026-10-11T04:00:00Z', note: '', created_at: '', updated_at: '' }];
  rows.objectives = [{ id: 'goal', user_id: userId, kind: 'goal', name: 'Emergency fund', target_amount: '5000.00', currency: 'MYR', status: 'active', priority: 'normal', target_date: null, category: 'Safety', notes: '', created_at: '', updated_at: '' }];
  rows.objective_contributions = [{ id: 'earmark', user_id: userId, objective_id: 'goal', currency: 'MYR', amount: '3000.00', effective_amount: '3000.00', transaction_id: null, transfer_id: null, account_id: null, contributed_at: '2026-10-11T04:00:00Z', note: '', created_at: '' }];
  rows.person_debts = [{ id: 'loan', user_id: userId, direction: 'i_owe', counterparty: 'Synthetic lender', original_amount: '1000.00', currency: 'MYR', due_date: '2026-10-20', notes: '', created_at: '', updated_at: '' }];
  rows.debt_repayments = [{ id: 'principal', user_id: userId, debt_id: 'loan', currency: 'MYR', amount: '100.00', effective_amount: '100.00', transaction_id: null, account_id: 'main', paid_at: '2026-10-12T04:00:00Z', note: '', created_at: '' }];
  // Independent native oracle: 1000 + 5200 - 3060 - 200 - 100 = 2840;
  // reserve = 2000 + 200 = 2200. Earmarking never debits cash.
  await page.route(`${supabaseUrl}/rest/v1/exact_accounts*`, route => route.fulfill({ json: (rows.accounts as Record<string, unknown>[]).map(a => ({ ...a, balance: a.id === 'main' ? '2840.00' : '2200.00', linked_activity_count: 4 })) }));
  await page.route('**/api/rates?*', route => route.fulfill({ json: { base: 'MYR', rates: { MYR: 1, USD: .23, EUR: .21, JPY: 34 }, updatedAt: Date.parse('2026-10-13T04:00:00Z'), source: 'Synthetic QA reference' } }));
}

for (const [locale, theme] of [['en', 'light'], ['ms', 'dark']] as const) {
  // Supplied image is 1365x720 including browser chrome. Also exercise the
  // approximately 1360x636 content viewport, then every narrower breakpoint.
  for (const [width, height] of [[320,740],[390,844],[640,800],[768,900],[1024,800],[1360,636],[1365,720],[1440,1000]]) {
    test(`whole dashboard amounts and hierarchy ${locale} ${width}x${height}`, async ({ page }, testInfo) => {
      await seed(page, locale, theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard');
      await expect(page.locator('.snapshot-metric.income strong')).toContainText('5,200.00');
      await expect(page.locator('.snapshot-metric.expense strong')).toContainText('3,060.00');
      await expect(page.locator('.snapshot-value')).toContainText('2,140.00');
      await page.evaluate(() => document.fonts.ready);
      const geometry = () => page.locator('.snapshot .money-token').evaluateAll(tokens => tokens.map(token => {
        const range = document.createRange(); range.selectNodeContents(token);
        const text = range.getBoundingClientRect(), box = token.parentElement!.getBoundingClientRect();
        return { lines: new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size,
          fits: text.left >= box.left - 1 && text.right <= box.right + 1,
          readable: parseFloat(getComputedStyle(token).fontSize) >= 14 };
      }));
      await expect.poll(geometry).toEqual(Array.from({ length: 4 }, () => ({ lines: 1, fits: true, readable: true })));
      await expect(page.getByRole('complementary', { name: locale === 'en' ? 'Analytics summary bar' : 'Bar ringkasan analitik' })).toHaveCount(0);
      if (width < 768) {
        const position = await page.locator('.module-position').boundingBox(), chart = await page.locator('.module-cashFlow').boundingBox();
        expect(position!.y).toBeLessThan(chart!.y);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('dashboard-amounts.png'), fullPage: true });
      await page.getByRole('button', { name: locale === 'en' ? 'Privacy Mode' : 'Mod Privasi', exact: true }).click();
      await expect(page.locator('.snapshot')).not.toContainText('5,200.00');
      await expect(page.locator('.snapshot')).not.toContainText('3,060.00');
      await expect.poll(geometry).toEqual(Array.from({ length: 4 }, () => ({ lines: 1, fits: true, readable: true })));
      await page.goto('/transactions');
      await expect(page.locator('.analytics-bar')).toBeVisible();
      expect(await page.locator('.analytics-bar').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    });
  }
  for (const font of ['system', 'Arial']) for (const width of [320, 768, 1365]) test(`maximum exact money stays legible ${locale} ${width} ${font}`, async ({ page }) => {
    await seed(page, locale, theme); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    if (font === 'Arial') await page.route('**/*.css', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}\n.snapshot { font-family: Arial, sans-serif; }` });
    });
    for (const currency of ['MYR', 'USD', 'EUR', 'JPY']) {
      const amount = currency === 'JPY' ? '9999999999999999' : '9999999999999999.99';
      rows.profiles[0] = { ...rows.profiles[0] as object, currency };
      rows.transactions = [{ id: 'huge', user_id: userId, account_id: 'main', category_id: null, payment_method_id: null, description: 'Maximum exact synthetic amount', currency, amount, type: 'income', transaction_date: '2026-10-10T04:00:00Z', created_at: '' }];
      await page.goto('/dashboard');
      await expect(page.locator('.snapshot-value')).toContainText(currency === 'JPY' ? '9,999,999,999,999,999' : '9,999,999,999,999,999.99');
      await expect.poll(() => page.locator('.snapshot .fit-money').evaluateAll(boxes => boxes.every(box => {
        const token = box.querySelector('.money-token')!;
        const range = document.createRange(); range.selectNodeContents(token);
        return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size === 1 &&
          box.scrollWidth <= box.clientWidth + 1 && parseFloat(getComputedStyle(token).fontSize) >= 14;
      }))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.goto('/analytics');
      // Analytics resolves its separate comparison queries; use the existing
      // analytics readiness budget before measuring the rendered amount.
      await expect(page.locator('.analytics-metric.income .money-token')).toContainText(currency === 'JPY' ? '9,999,999,999,999,999' : '9,999,999,999,999,999.99', { timeout: 20_000 });
      await expect.poll(() => page.locator('.analytics-metrics .fit-money').evaluateAll(boxes => boxes.every(box => {
        const token = box.querySelector('.money-token')!;
        const range = document.createRange(); range.selectNodeContents(token);
        return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size === 1 &&
          box.scrollWidth <= box.clientWidth + 1 && parseFloat(getComputedStyle(token).fontSize) >= 14;
      }))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  });
}

for (const [locale, theme] of [['en', 'light'], ['ms', 'dark']] as const) for (const width of [320, 390, 768]) {
  test(`transfer action remains a whole readable label ${locale} ${width}`, async ({ page }) => {
    await seed(page, locale, theme); await page.setViewportSize({ width, height: 900 });
    await page.goto('/accounts');
    if (width < 768) for (const label of await page.locator('.mobile-bottom-nav > a > span,.mobile-bottom-nav > button > span').all()) {
      expect(await label.evaluate(span => {
        const range = document.createRange(); range.selectNodeContents(span);
        const text = range.getBoundingClientRect(), button = span.parentElement!.getBoundingClientRect();
        return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size === 1 &&
          text.left >= button.left && text.right <= button.right && button.width >= 44;
      })).toBe(true);
    }
    const action = page.getByRole('button', { name: locale === 'en' ? 'New transfer' : 'Pindahan baharu', exact: true });
    await expect(action).toBeEnabled();
    expect(await action.evaluate(button => {
      const range = document.createRange(); range.selectNodeContents(button);
      return new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
    })).toBe(1);
    await action.click(); await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(action).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

for (const [locale,theme] of [['en','light'],['ms','dark'],['en','dark'],['ms','light']] as const) test(`chart marks retain graphical contrast ${locale}/${theme}`, async({page})=>{
  await seed(page,locale,theme);await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});await page.goto('/dashboard');
  const chart=page.locator('.module-cashFlow section');
  await expect(chart.locator('.cash-flow-expense i')).toBeVisible();
  await expect(chart.locator('path[fill="var(--data-spending)"]')).not.toHaveCount(0);
  const ratios=await chart.evaluate(element=>{
    const rgb=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number);
    const luminance=(color:number[])=>color.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
    const background=luminance(rgb(getComputedStyle(element).backgroundColor));
    return [...element.querySelectorAll('.chart-legend i,path[fill="var(--data-spending)"],path[fill="var(--cash-income)"]')].map(mark=>{
      const style=getComputedStyle(mark),foreground=luminance(rgb(mark.tagName.toLowerCase()==='i'?style.backgroundColor:style.fill));
      return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
    });
  });
  expect(ratios.length).toBeGreaterThanOrEqual(4);
  for(const ratio of ratios)expect(ratio).toBeGreaterThanOrEqual(3);
  await mkdir('artifacts/calm-precision/screens',{recursive:true});
  await writeFile(`artifacts/calm-precision/screens/graphical-contrast-${locale}-${theme}.json`,JSON.stringify({locale,theme,minimum:Math.min(...ratios),ratios},null,2));
  for(const width of locale==='ms'&&theme==='light'?[390,768,1440]:[390,1440]){
    await page.setViewportSize({width,height:width===390?844:1000});
    await page.screenshot({path:`artifacts/calm-precision/screens/dashboard-${width}-${locale}-${theme}.png`,fullPage:true});
  }
});

test('cash flow, account cash, allocation and principal reconcile independently', async ({ page }) => {
  await seed(page); await page.goto('/dashboard');
  await expect(page.locator('.snapshot-value')).toContainText('2,140.00');
  await expect(page.locator('.snapshot-metric.income')).toContainText('5,200.00');
  await expect(page.locator('.snapshot-metric.expense')).toContainText('3,060.00');
  await expect(page.locator('.position-section').filter({ hasText: 'Your accounts' })).toContainText('2,840.00');
  await expect(page.locator('.position-section').filter({ hasText: 'Your accounts' })).toContainText('2,200.00');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
  await expect(page.locator('.position-section').filter({ hasText: 'Your commitments' })).toContainText('900.00');
  await page.locator('.module-cashFlow summary').click();
  await expect(page.locator('.module-cashFlow tbody tr')).toHaveCount(6);
  await page.locator('.module-cashFlow').getByRole('button', { name: /Oct.*expense/i }).click();
  await expect(page).toHaveURL(/activity=ordinary/);
  await expect(page.locator('.transaction-workspace')).toContainText('Recorded rent');
  expect(rows.transactions).toHaveLength(3);
});

test('privacy masks goal percentages, milestone text and accessible progress values', async ({ page }) => {
  await seed(page); await page.goto('/goals?item=goal');
  const goal = page.locator('button.selection-card').filter({ hasText: 'Emergency fund' });
  await expect(goal).toContainText('60%');
  const bars = page.getByRole('progressbar'); await expect(bars).toHaveCount(2);
  await page.getByRole('button', { name: 'Privacy Mode', exact: true }).click();
  await expect(goal).not.toContainText('60%');
  await expect(page.locator('.milestone-note')).toHaveCount(0);
  for (const bar of await bars.all()) {
    await expect(bar).not.toHaveAttribute('aria-valuenow');
    await expect(bar.locator('.progress-fill')).toHaveCSS('width', '0px');
  }
  const scan = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.getByRole('button', { name: 'Privacy Mode', exact: true }).click();
  await expect(goal).toContainText('60%');
  for (const bar of await bars.all()) await expect(bar).toHaveAttribute('aria-valuenow', '60');
});

test('mobile navigation, keyboard drawer, quick add, account drilldown and history remain usable', async ({ page }) => {
  await seed(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/dashboard');
  const bottom = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
  await expect(bottom).toBeVisible();
  await bottom.getByRole('button', { name: 'More', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Workspace' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(bottom.getByRole('button', { name: 'More', exact: true })).toBeFocused();
  await bottom.getByRole('button', { name: 'Quick Add', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(bottom.getByRole('button', { name: 'Quick Add', exact: true })).toBeFocused();
  await page.goto('/accounts');
  await page.locator('article.account-card').filter({ has: page.getByRole('heading', { name: 'Everyday account', exact: true }) }).getByRole('button', { name: 'View transactions', exact: true }).click();
  await expect(page).toHaveURL(/account=main/); await expect(page.getByRole('combobox', { name: 'Accounts', exact: true })).toHaveValue('main');
  await expect(page.getByRole('combobox', { name: 'Currency', exact: true })).toHaveValue('MYR');
  await page.reload(); await expect(page.getByRole('combobox', { name: 'Accounts', exact: true })).toHaveValue('main');
  await page.goBack(); await expect(page.locator('main h1')).toHaveText('Accounts');
  await page.goto('/transactions?search=Recorded%20rent&account=main&currency=MYR');
  await expect(page.getByRole('textbox', { name: 'Search transactions…', exact: true })).toHaveValue('Recorded rent');
  await expect(page.locator('.transaction-workspace')).toContainText('Recorded rent');
  await page.reload(); await expect(page.getByRole('textbox', { name: 'Search transactions…', exact: true })).toHaveValue('Recorded rent');
});

test('transaction pending and failed pages never report an empty successful result', async ({ page }) => {
  await seed(page);
  let release: () => void = () => {};
  const pending = new Promise<void>(done => { release = done; });
  await page.route(`${supabaseUrl}/rest/v1/rpc/transaction_page`, async route => { await pending; await route.fulfill({ status: 503, json: { message: 'Synthetic unavailable' } }); });
  await page.goto('/transactions');
  await expect(page.locator('.transaction-loading')).toBeVisible();
  await expect(page.locator('.transaction-workspace .empty-state')).toHaveCount(0);
  release();
  await expect(page.locator('.transaction-workspace').getByRole('alert')).toBeVisible();
  await expect(page.locator('.transaction-workspace .empty-state')).toHaveCount(0);
});

test('rapid repeated submit posts one exact transaction and retains a reachable mobile save action', async ({ page }) => {
  await seed(page); await page.setViewportSize({ width: 320, height: 640 });
  let release: () => void = () => {}; const pending = new Promise<void>(done => { release = done; }); let writes = 0;
  await page.route(`${supabaseUrl}/rest/v1/transactions*`, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    writes++; const input = route.request().postDataJSON(); expect(input).toMatchObject({ amount: '20.10' });
    await pending;
    rows.transactions.push({ ...input, id: 'single-exact-save', created_at: '2026-10-13T04:00:00Z' });
    await route.fulfill({ status: 201, json: { id: 'single-exact-save' } });
  });
  await page.goto('/transactions'); await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('20.10');
  await expect(dialog).toContainText('MYR: up to 2 decimal places. Amounts are saved exactly.');
  await dialog.locator('form').evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  await expect.poll(() => writes).toBe(1); await expect(dialog.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
  release(); await expect(dialog).toHaveCount(0); expect(writes).toBe(1);
});

test('empty transaction records and empty filtered results give distinct guidance', async ({ page }) => {
  await mockSignedInApp(page); const recorded = structuredClone(rows.transactions); rows.transactions = [];
  await page.goto('/transactions'); await expect(page.getByRole('heading', { name: 'No transactions recorded yet', exact: true })).toBeVisible();
  rows.transactions = recorded; await page.goto('/transactions?search=not-a-record');
  await expect(page.getByRole('heading', { name: 'No transactions found', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No transactions recorded yet', exact: true })).toHaveCount(0);
});

test('200/400 percent equivalent reflow keeps form errors and save controls operable', async ({ page }) => {
  await seed(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [640, 320]) {
    // 1280 CSS px divided by 2/4: WCAG reflow geometry, not an OS zoom claim.
    await page.setViewportSize({ width, height: 600 }); await page.goto('/transactions');
    await page.getByRole('button', { name: 'Add transaction', exact: true }).click(); const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('1.234');
    const save = dialog.getByRole('button', { name: 'Add transaction', exact: true }); await save.click();
    await expect(dialog.getByRole('alert')).toContainText('MYR allows 2 decimal places');
    await save.scrollIntoViewIfNeeded(); const box = await save.boundingBox(); expect(box!.y + box!.height).toBeLessThanOrEqual(601);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `artifacts/calm-precision/screens/form-reflow-${width}-en-light.png`, fullPage: true });
    await page.keyboard.press('Escape');
  }
});

const routes = ['dashboard', 'transactions', 'accounts', 'plans', 'goals', 'savings', 'debts', 'analytics', 'accounting', 'notes', 'reminders', 'notifications', 'calendar', 'categories', 'payments', 'settings'];
for (const [locale, theme] of [['en', 'light'], ['ms', 'dark']] as const) {
  for (const width of [390, 1440]) for (const route of routes) test(`screen ${route} ${width}: ${locale}/${theme}, screenshot and automated accessibility`, async ({ page }) => {
    await seed(page, locale, theme);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mkdir('artifacts/calm-precision/screens', { recursive: true });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`/${route}`); await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('.page-description')).not.toBeEmpty();
    await expect(page.locator('main [role="status"]').filter({ hasText: /Loading|Memuatkan/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
    if (width === 390) await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    await writeFile(`artifacts/calm-precision/screens/a11y-${route}-${width}-${locale}-${theme}.json`, JSON.stringify({ route, width, locale, theme, violations: scan.violations }, null, 2));
    expect(scan.violations, `${route}/${width}`).toEqual([]);
    await page.screenshot({ path: `artifacts/calm-precision/screens/${route}-${width}-${locale}-${theme}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

for (const [locale, theme] of [['en', 'dark'], ['ms', 'light']] as const) test(`core surfaces in complementary mode ${locale}/${theme}`, async ({ page }) => {
  test.setTimeout(150_000); await seed(page, locale, theme);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['dashboard', 'transactions', 'accounts', 'goals', 'settings']) {
      await page.goto(`/${route}`); await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main .loading-state')).toHaveCount(0);
      await expect(page.locator('main [role="status"]').filter({ hasText: /Loading|Memuatkan/ })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `artifacts/calm-precision/screens/${route}-${width}-${locale}-${theme}.png`, fullPage: true });
    }
  }
});

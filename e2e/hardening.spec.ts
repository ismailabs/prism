import { test, expect } from '@playwright/test';
import { mockSignedInApp, rows, supabaseUrl } from './fixtures';
test('Malay CSV precision errors remain actionable and do not submit financial rows', async ({ page }) => {
  await mockSignedInApp(page); rows.profiles[0].language = 'ms';
  let writes = 0; page.on('request', request => { if (request.url().startsWith(supabaseUrl + '/rest/v1/transactions') && ['POST', 'PATCH', 'DELETE'].includes(request.method())) writes++; });
  await page.goto('/transactions'); await page.getByRole('button', { name: 'Import CSV', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Fail CSV').setInputFiles({ name: 'precision.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Amount,Description\n2026-10-10,1.50,Exact JPY fixture') });
  await form.getByRole('combobox', { name: 'Mata wang lalai', exact: true }).selectOption('JPY');
  await form.getByRole('button', { name: 'Pratonton dan sahkan' }).click();
  await expect(form.getByRole('alert')).toContainText('JPY membenarkan 0 tempat perpuluhan');
  await expect(form.getByRole('button', { name: 'Import baris yang disahkan' })).toBeDisabled(); expect(writes).toBe(0);
});
test('a dropped financial response does not resubmit on reconnect', async ({ page, context }) => {
  await mockSignedInApp(page); let writes = 0;
  await page.route(supabaseUrl + '/rest/v1/transactions*', async route => {
    if (route.request().method() === 'POST') { writes++; await route.abort('internetdisconnected'); } else await route.fallback();
  });
  await page.goto('/transactions'); await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  const form = page.getByRole('dialog'); await form.getByLabel('Description', { exact: true }).fill('Lost response fixture'); await form.getByLabel('Amount', { exact: true }).fill('10.01');
  await form.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await expect(form.getByRole('alert')).toContainText('check your records first'); expect(writes).toBe(1);
  await context.setOffline(true); await expect(page.getByRole('heading', { name: 'You are offline', exact: true })).toBeVisible();
  const read = page.waitForResponse(response => response.url().includes('/rest/v1/rpc/transaction_page') && response.status() === 200);
  await context.setOffline(false); await read;
  await expect(page.getByRole('heading', { name: 'All transactions', level: 1, exact: true })).toBeVisible(); expect(writes).toBe(1);
  expect(rows.transactions.some(row => row.description === 'Lost response fixture')).toBe(false);
});
test('Malay installation help and public FAQ labels are translated', async ({ page }) => {
  await mockSignedInApp(page); rows.profiles[0].language = 'ms'; await page.goto('/settings');
  const installation = page.getByRole('region', { name: 'Pemasangan dan kemas kini' });
  await expect(installation).toContainText('Tambah ke Skrin Utama');
  await page.goto('/demo'); await expect(page.getByRole('link', { name: 'Soalan lazim', exact: true })).toBeVisible();
});
test('Malay destructive goal and savings dialogs use translated target names', async ({ page }) => {
  await mockSignedInApp(page); rows.profiles[0].language = 'ms';
  for (const [path, name, title] of [['/goals', 'Emergency fund', 'Padam matlamat'], ['/savings', 'Travel fund', 'Padam sasaran simpanan']]) {
    await page.goto(path);
    await page.locator('button.selection-card').filter({ has: page.getByRole('heading', { name, exact: true }) }).click();
    await page.getByRole('button', { name: 'Padam ' + name, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: title, exact: true }); await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Batal', exact: true }).click(); await expect(dialog).toHaveCount(0);
  }
  expect(rows.objectives).toHaveLength(2);
});

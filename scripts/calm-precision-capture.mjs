// Capture a real local UI interaction with isolated synthetic provider fixtures.
// Start scripts/e2e-server.mjs first. Hosted origins are deliberately forbidden.
import { chromium } from '@playwright/test';
import { mockSignedInApp, rows, userId } from '../e2e/fixtures.ts';
import { mkdir } from 'node:fs/promises';
const base = process.env.PRISM_CAPTURE_BASE_URL ?? 'http://127.0.0.1:5173';
const origin = new URL(base);
if (origin.hostname !== '127.0.0.1' || origin.protocol !== 'http:') throw new Error('Capture requires a loopback fixture origin');
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mockSignedInApp(page);
  Object.assign(rows.profiles[0], { username: 'Aina · synthetic QA', language: 'en', theme: 'light' });
  rows.objectives = [{ id: 'goal', user_id: userId, kind: 'goal', name: 'Emergency fund', notes: 'Synthetic QA only', category: 'Safety', priority: 'high', target_amount: '5000.00', currency: 'MYR', target_date: null, status: 'active', created_at: '', updated_at: '' }];
  rows.objective_contributions = [{ id: 'earmark', user_id: userId, objective_id: 'goal', amount: '3000.00', effective_amount: '3000.00', currency: 'MYR', contributed_at: '2026-10-11T04:00:00Z', transaction_id: null, account_id: null, transfer_id: null, note: 'Synthetic earmark; no cash movement', created_at: '' }];
  await page.route('**/api/rates?*', route => route.fulfill({ json: { base: 'MYR', rates: { MYR: 1, USD: .23, EUR: .21, JPY: 34 }, source: 'Synthetic QA reference', updatedAt: Date.parse('2026-10-13T04:00:00Z') } }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mkdir('artifacts/calm-precision/screens', { recursive: true });
  for (const [language, theme] of [['en', 'light'], ['ms', 'dark']]) {
    Object.assign(rows.profiles[0], { language, theme });
    await page.goto(base + '/goals?item=goal');
    await page.locator('button.selection-card[aria-pressed="true"]').waitFor();
    await page.locator('section.card').filter({ has: page.getByRole('button', { name: language === 'ms' ? 'Sunting' : 'Edit', exact: true }) }).waitFor();
    await page.screenshot({ path: `artifacts/calm-precision/screens/goal-detail-390-${language}-${theme}.png`, fullPage: true });
    console.log(`Captured goal detail ${language}/${theme} using synthetic data only`);
  }
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PRISM_PLAYWRIGHT || 'playwright');
process.env.VITE_SUPABASE_URL='https://fixture.supabase.co';process.env.VITE_SUPABASE_ANON_KEY='fixture-anon-key';const {createServer}=await import('vite');const devServer=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}});await devServer.listen();
const browser = await chromium.launch({ headless: true, ...(process.platform==='win32'?{channel:'msedge'}:{}) });
const context = await browser.newContext();
let page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const auth = `export const useAuth = () => ({ user: { id: 'qa-user', email: 'long-email-address@example.invalid' }, loading: false, requiresMfa: false, authError: null, signOut: async () => {}, refreshMfa: async () => {} }); export const AuthProvider = ({ children }) => children;`;
const finance = `
const language = localStorage.getItem('qa-locale') || 'en';
const theme = localStorage.getItem('qa-theme') || 'light';
const category = { user_id: 'qa-user', id: 'cat-1', name: 'VeryLongCategoryName'.repeat(4), type: 'expense', color: '#4265ee' };
const payment = { id: 'pay-1', name: 'VeryLongPaymentMethod'.repeat(4), type: 'credit_card' };
const transaction = { id: 'tx-1', description: 'LongUnbrokenDescription'.repeat(12), amount: '999999999999.00', currency: 'MYR', type: 'expense', category_id: 'cat-1', payment_method_id: 'pay-1', transaction_date: '2026-09-19T12:00:00Z' };
export const financeKeys = {all:id=>['finance',id]};
const result = data => ({ data, dataUpdatedAt: Date.now(), isPending: false, error: null, refetch: async () => {} });
const mutation = { isPending: false, mutateAsync: async () => {} };
export const useTransactions = () => result([transaction, { ...transaction, id: 'tx-2', type: 'income', description: 'Salary', amount: '5000.00' }]);
export const useListUsage = () => result([]);
export const useCategories = () => result([category]);
export const usePaymentMethods = () => result([payment]);
export const useProfile = () => result({ id: 'qa-user', username: 'ExtremelyLongDisplayName'.repeat(4), currency: 'MYR', language, theme });
export const useFinanceRealtime = () => {};
export const useTransactionMutations = () => ({ create: mutation, update: mutation, remove: mutation });
export const useCategoryMutations = useTransactionMutations;
export const usePaymentMethodMutations = useTransactionMutations;
export const useUpdateProfile = () => mutation;
`;
await context.route('**/src/hooks/useAuth.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: auth }));
await context.route('**/src/hooks/useFinanceData.ts*', route => route.fulfill({ contentType: 'application/javascript', body: finance }));
const platform = `const result=data=>({data,dataUpdatedAt:Date.now(),isPending:false,error:null,refetch:async()=>{}});const mutation={isPending:false,mutateAsync:async()=>{}};export const usePlatformTable=()=>result([]);export const usePlatformMutation=()=>({create:mutation,update:mutation,remove:mutation});`;
await context.route('**/src/hooks/usePlatformData.ts*',route=>route.fulfill({contentType:'application/javascript',body:platform}));
await context.route('**/src/hooks/useFinancialReports.ts*',route=>route.fulfill({contentType:'application/javascript',body:`export const useAnalyticsReport = () => ({data:[],isPending:false,error:null}); export const useFinancialReport=()=>({data:undefined,isPending:false,error:null});export const useTransactionPage=()=>({data:{rows:[{id:'tx-1',user_id:'qa-user',amount:'25.00',currency:'MYR',type:'expense',category_id:null,payment_method_id:null,description:'Purchase',transaction_date:'2026-09-19T12:00:00Z',created_at:''}],total:1},isPending:false,error:null});`}));
await context.route('**/src/hooks/usePlanningData.ts*',route=>route.fulfill({contentType:'application/javascript',body:`export const usePlanningData=()=>({budgets:{data:[],error:null},rules:{data:[],error:null},importRows:{isPending:false}});`}));
await context.route('**/src/hooks/useAdvancedPlanning.ts*',route=>route.fulfill({contentType:'application/javascript',body:`const query={data:[],isPending:false,error:null,refetch:async()=>{}};const mutation={isPending:false,mutateAsync:async()=>{}};export const useAdvancedPlanning=()=>({reserves:query,contracts:query,reserve:mutation,removeReserve:mutation,contract:mutation});`}));
const actionMock = `const query={data:[],isPending:false,error:null,refetch:async()=>{}};const mutation={isPending:false,mutateAsync:async()=>{}};export const defaultActionPreferences={reminders_enabled:true,debt_enabled:true,recurring_enabled:true,budget_enabled:true,goal_enabled:true};export const useActionTable=()=>query;export const useNotes=()=>({...query,data:{rows:[],total:0}});export const useNoteMutations=()=>({save:mutation,update:mutation});export const useActionMutations=()=>({save:mutation,update:mutation,receipt:mutation,preferences:mutation});`;
await context.route('**/src/hooks/useActionData.ts*',route=>route.fulfill({contentType:'application/javascript',body:actionMock}));
await context.route('**/src/hooks/useGoalActions.ts*',route=>route.fulfill({contentType:'application/javascript',body:`const query={data:[],isPending:false,error:null,refetch:async()=>{}};const mutation={isPending:false,mutateAsync:async()=>{}};export const useGoalActions=()=>({plans:query,save:mutation,remove:mutation,contribute:mutation});`}));
await context.route('**/src/hooks/useActionTimeline.ts*',route=>route.fulfill({contentType:'application/javascript',body:`import {defaultActionPreferences} from '/src/hooks/useActionData.ts';export const useActionClock=()=>Date.now();export const useActionTimeline=()=>({sources:{transactions:[],reminders:[],notes:[],receipts:[],preferences:defaultActionPreferences,goals:[],contributions:[],transfers:[],plans:[],debts:[],repayments:[],rules:[],budgets:[]},pending:false,error:null,refresh:async()=>{}});`}));
await context.route('**/src/lib/supabase.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const initialAuthLinkError = false; export const initialAuthCallback = false; export const clearAuthLinkParameters = () => {}; export const supabase = { auth: { mfa: { listFactors: async () => ({ data: { totp: [] }, error: null }) } } };` }));
await context.route('**/api/rates?*', route => route.fulfill({ json: { base: 'MYR', rates: { USD: .23, EUR: .21, JPY: 34, MYR: 1 }, updatedAt: Date.now(), source: 'QA fixture' } }));
const checks = [];
async function contained(label, dialog = false) {
  const bounds = await page.evaluate(isDialog => {
    const root = isDialog ? document.querySelector('[role="dialog"], dialog[open]') : document.documentElement;
    const rect = root.getBoundingClientRect();
    const leaks = [...root.querySelectorAll('input, select, button, h1, h2, h3, h4, p, dd')].filter(el => {
      if (!el.getClientRects().length || el.closest('.app-nav, .analytics-bar, table, [data-radix-popper-content-wrapper]')) return false;
      const r = el.getBoundingClientRect();
      return r.width && (r.left < -1 || r.right > innerWidth + 1);
    }).map(el => ({ tag: el.tagName, text: el.textContent.slice(0, 60), width: el.getBoundingClientRect().width }));
    const wide = [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({ tag: el.tagName, class: String(el.className), right: el.getBoundingClientRect().right, position: getComputedStyle(el).position, overflow: getComputedStyle(el).overflowX }));
    return { scroll: root.scrollWidth, width: root.clientWidth, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: innerHeight, viewport: innerWidth, leaks, wide };
  }, dialog);
  assert(bounds.scroll <= bounds.width + 1, `${label}: internal overflow ${JSON.stringify(bounds)}`);
  assert.deepEqual(bounds.leaks, [], `${label}: leaking elements`);
  if (dialog) {
    assert(bounds.left >= 0 && bounds.right <= bounds.viewport + 1 && bounds.top >= 0 && bounds.bottom <= bounds.height + 1, `${label}: clipped modal ${JSON.stringify(bounds)}`);
    const actions = page.locator('[role="dialog"] form button, [role="dialog"] .modal-actions button, dialog[open] button').last();
    await actions.scrollIntoViewIfNeeded();
    assert(await actions.isVisible(), `${label}: inaccessible final action`);
    const actionBounds = await actions.boundingBox();
    assert(actionBounds.y >= bounds.top && actionBounds.y + actionBounds.height <= bounds.bottom + 1, `${label}: final action clipped`);
  }
  checks.push(label);
}
await mkdir('artifacts', { recursive: true });
try {
  for (const locale of ['en', 'ms']) {
    await context.addInitScript(({ locale }) => { localStorage.setItem('qa-locale', locale); localStorage.setItem('qa-theme', locale === 'ms' ? 'dark' : 'light'); }, { locale });
    for (const width of (process.env.PRISM_QA_WIDTH ? [Number(process.env.PRISM_QA_WIDTH)] : [320, 360, 375, 390, 414, 640, 768, 1024, 1280, 1440])) {
      // Release the prior document and its dev-module graph on low-memory hosts.
      await page.close();
      page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 740 });
      await page.goto('http://127.0.0.1:5174/');
      const routeTitles = locale === 'en'
        ? ['Overview','All transactions','Analytics','Accounting laboratory','Accounts','Plans','Goals','Savings','Personal debts','Notes','Reminders','Notifications','Calendar','Categories','Payment methods','Settings']
        : ['Gambaran keseluruhan','Semua transaksi','Analitik','Makmal perakaunan','Akaun','Perancangan','Matlamat','Simpanan','Hutang peribadi','Nota','Peringatan','Pemberitahuan','Kalendar','Kategori','Kaedah pembayaran','Tetapan'];
      let routeIndex = 0;
      for (const route of ['/', '/transactions', '/analytics', '/accounting', '/accounts', '/plans', '/goals', '/savings', '/debts', '/notes', '/reminders', '/notifications', '/calendar', '/categories', '/payments', '/settings']) {
        if (route !== '/') await page.evaluate(path => { history.pushState(null, '', path); dispatchEvent(new PopStateEvent('popstate')); }, route);
        await page.waitForFunction(title => document.querySelector('main h1')?.textContent === title, routeTitles[routeIndex++]);
        const actionReady = {
          '/notes': locale === 'en' ? 'No notes match this view.' : 'Tiada nota sepadan dengan paparan ini.',
          '/reminders': locale === 'en' ? 'No reminders in this view.' : 'Tiada peringatan dalam paparan ini.',
          '/notifications': locale === 'en' ? '0 open notices' : '0 notis terbuka',
          '/calendar': locale === 'en' ? '0 items' : '0 perkara',
        }[route];
        if (actionReady) await page.getByRole('main').getByText(actionReady, { exact: true }).waitFor();
        else await page.locator('main .card, main .metric-grid').first().waitFor();
        if (route === '/') {
          await page.getByLabel(locale === 'en' ? 'Month' : 'Bulan', {exact:true}).fill('2026-09');
          await page.locator('.snapshot').waitFor();
        }
        await contained(`${locale} ${width} ${route}`);
        if (width === 375 && locale === 'en') await page.screenshot({ path: `artifacts/mobile-${route === '/' ? 'dashboard' : route.slice(1)}.png`, fullPage: true });
        if (route === '/transactions') {
          await page.getByRole('button', { name: locale === 'en' ? 'Filters' : 'Penapis', exact: true }).click();
          await contained(`${locale} ${width} filters`);
          await page.getByRole('button', { name: locale === 'en' ? 'Add transaction' : 'Tambah transaksi', exact: true }).click();
          await contained(`${locale} ${width} add transaction`, true);
          if (width === 375 && locale === 'en') await page.screenshot({ path: 'artifacts/mobile-modal.png' });
          await page.keyboard.press('Escape');
          const actions = page.getByRole('button', { name: /^(Actions|Tindakan):/ }).first();
          await actions.click();
          await page.getByRole('menuitem', { name: locale === 'en' ? 'Delete' : 'Padam', exact: true }).click();
          await contained(`${locale} ${width} delete transaction`, true);
          await page.keyboard.press('Escape');
        }
        if (route === '/categories' || route === '/payments') {
          await page.getByRole('button', { name: locale === 'en' ? (route === '/categories' ? 'Add category' : 'Add payment method') : (route === '/categories' ? 'Tambah kategori' : 'Tambah kaedah pembayaran'), exact: true }).click();
          await contained(`${locale} ${width} ${route} form`, true);
          await page.keyboard.press('Escape');
        }
        if(route==='/notes'||route==='/reminders'){
          await page.getByRole('button',{name:locale==='en'?(route==='/notes'?'New note':'New reminder'):(route==='/notes'?'Nota baharu':'Peringatan baharu'),exact:true}).click();
          await page.getByLabel(locale==='en'?'Title':'Tajuk',{exact:true}).fill('LongUnbrokenPrivateContext'.repeat(4));
          if(route==='/notes')await page.getByLabel(locale==='en'?'Plain-text note':'Nota teks biasa',{exact:true}).fill('LongUnbrokenFinancialDecision'.repeat(100));
          await contained(`${locale} ${width} ${route} form`,true);
          await page.keyboard.press('Escape');
        }
        if (route === '/settings') {
          await page.getByRole('button', { name: locale === 'en' ? 'Manage 2FA' : 'Urus 2FA', exact: true }).click();
          await contained(`${locale} ${width} MFA dialog`, true);
          await page.keyboard.press('Escape');
        }
      }
      console.log(`Verified ${locale} at ${width}px`);
    }
  }
  await page.setViewportSize({ width: 320, height: 360 });
  await page.goto('http://127.0.0.1:5174/transactions');
  await page.getByRole('button', { name: /^(Add transaction|Tambah transaksi)$/, exact: true }).click();
  await contained('short viewport 320x360 dialog', true);
  assert.deepEqual(errors, [], 'Browser exceptions');
  await writeFile('artifacts/responsive-checks.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(`PASS: ${checks.length} layout checks and no browser errors.`);
} catch (error) {
  console.log(JSON.stringify({ url: page.url(), text: await page.locator('body').innerText(), errors }));
  await page.screenshot({ path: 'artifacts/qa-failure.png', fullPage: true });
  throw error;
} finally { await browser.close();if(devServer)await devServer.close(); }

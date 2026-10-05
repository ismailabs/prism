import { expect, test } from '@playwright/test';
import { mockSignedInApp, rows, supabaseUrl } from './fixtures';

test('redesigned overview preserves financial context across themes, locales and viewports', async ({ page }) => {
  test.setTimeout(150_000);
  await mockSignedInApp(page);
  await page.route('**/api/rates?*', route => route.fulfill({json:{base:'MYR',rates:{MYR:1,USD:.23,EUR:.21,JPY:34},updatedAt:Date.now(),source:'QA fixture'}}));
  await page.route(supabaseUrl+'/rest/v1/finance_net_flow*',route => route.fulfill({json:[{currency:'MYR',amount:'4054.00'}]}));
  rows.accounts = [{ ...(rows.accounts[0] as object), name:'Everyday account', opening_balance:'12450.00' }];
  rows.categories = ['Food & groceries','Home','Transport'].map((name,i) => ({id:`cat-${i}`,name,type:'expense',color:'#16836c'}));
  rows.transactions = [
    {id:'salary',description:'September salary',amount:'6800.00',type:'income',category_id:null},
    {id:'home',description:'Monthly rent',amount:'1800.00',type:'expense',category_id:'cat-1'},
    {id:'food',description:'Groceries',amount:'746.00',type:'expense',category_id:'cat-0'},
    {id:'transport',description:'Train & rides',amount:'200.00',type:'expense',category_id:'cat-2'},
  ].map(tx => ({...tx,user_id:'11111111-1111-4111-8111-111111111111',currency:'MYR',account_id:'account-1',payment_method_id:null,transaction_date:'2026-09-20T12:00:00Z',created_at:'2026-09-20T12:00:00Z'}));
  rows.objective_contributions = [{id:'contribution-1',objective_id:'goal-1',amount:'300.00',currency:'MYR',contributed_at:'2026-09-19T12:00:00Z',transaction_id:null}];
  await page.route(supabaseUrl+'/rest/v1/finance_monthly_totals*',route => route.fulfill({json:Array.from({length:6},(_,i) => [`2026-0${i+4}`,i]).flatMap(([month,index]) => [{month,currency:'MYR',type:'income',amount:String(6000+Number(index)*160),category_id:null},...rows.transactions.slice(1).map(tx => ({...(tx as object),month,transaction_count:1}))])}));
  const errors:string[]=[];
  page.on('pageerror',error => errors.push(error.message));
  for (const [locale,theme] of [['en','light'],['en','dark'],['ms','light'],['ms','dark']] as const) {
    Object.assign(rows.profiles[0] as object,{language:locale,theme});
    await page.goto('/');
    await expect(page.locator('.snapshot')).toBeVisible({timeout:20_000});
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await page.getByLabel(locale === 'ms' ? 'Bulan' : 'Month',{exact:true}).fill('2026-09');
    for (const width of [320,375,390,414,768,1024,1280,1440]) {
      await page.setViewportSize({width,height:width < 640 ? 844 : 1000});
      await expect(page.locator('.snapshot-value')).toContainText('4,054.00');
      await expect(page.locator('.snapshot-metric').last()).toContainText('59.6%');
      await expect(page.getByRole('progressbar').first()).toHaveAttribute('aria-valuenow','60');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('lang',locale);
      if (width === 1440 || width === 390) await page.screenshot({path:`artifacts/redesign-${width}-${locale}-${theme}.png`,fullPage:true});
    }
  }
  expect(errors).toEqual([]);
});

test('authentication is readable on narrow screens in both languages and themes', async ({ page }) => {
  for (const [locale,theme] of [['en','light'],['ms','dark']] as const) {
    await page.addInitScript(({locale,theme}) => localStorage.setItem('prism-preferences',JSON.stringify({state:{locale,theme},version:1})),{locale,theme});
    for (const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:900});
      await page.goto('/');
      await expect(page.locator('#auth-title')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button',{name:locale === 'ms' ? 'Cipta akaun' : 'Create account',exact:true}).first().click();
      await expect(page.getByLabel(locale === 'ms' ? 'Nama anda' : 'Your name',{exact:true})).toBeVisible();
      if (width === 1440 || width === 375) await page.screenshot({path:`artifacts/redesign-auth-${width}-${locale}-${theme}.png`,fullPage:true});
    }
  }
});

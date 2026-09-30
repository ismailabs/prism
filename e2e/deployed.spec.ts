import {expect,test} from '@playwright/test';
import {mockSignedInApp} from './fixtures';

test('deployed bundle renders protected routes and financial workflows with isolated API fixtures',async({page})=>{
 const base=process.env.PRISM_E2E_BASE_URL;if(!base)throw new Error('Set PRISM_E2E_BASE_URL for deployed verification.');
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('realtime'))errors.push(message.text());});
 if(process.env.PRISM_DEPLOYMENT_BYPASS){await page.route(new URL(base).origin+'/**',async route=>route.continue({headers:{...route.request().headers(),'x-vercel-protection-bypass':process.env.PRISM_DEPLOYMENT_BYPASS!,'x-vercel-set-bypass-cookie':'true'}}));}
 await page.goto('/settings');await expect(page.getByRole('heading',{name:'Your money. A clearer picture.'})).toBeVisible();
 await page.getByRole('button',{name:'Forgot password?'}).click();await expect(page.getByRole('heading',{name:'Forgot password'})).toBeVisible();
 await mockSignedInApp(page);
 await page.goto('/');await expect(page.getByText('Tracked net flow')).toBeVisible();
 await page.getByRole('button',{name:'Add transaction',exact:true}).click();await page.getByLabel('Description', {exact:true}).fill('Safe fixture transaction');await page.getByLabel('Amount',{exact:true}).fill('0.10');await page.getByRole('dialog').getByRole('button',{name:'Add transaction',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goto('/accounts');await expect(page.getByText('Everyday account')).toBeVisible();await page.getByRole('button',{name:'New transfer',exact:true}).click();await page.getByLabel('Source account').selectOption('account-1');await page.getByLabel('Destination account').selectOption('account-2');await page.getByLabel('Source amount').fill('10.00');await page.getByLabel('Destination amount').fill('2.30');await page.getByRole('button',{name:'Save transfer',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goto('/plans');await expect(page.getByText('Emergency fund',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Savings',exact:true}).click();await expect(page.getByText('Travel fund',{exact:true})).toBeVisible();
 await page.goto('/debts');await expect(page.getByText('Alex',{exact:true})).toBeVisible();
 await page.goto('/settings');await expect(page.getByLabel('Financial timezone')).toHaveValue('Asia/Kuala_Lumpur');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.getByRole('dialog',{name:'Workspace'})).toBeVisible();await page.getByRole('dialog',{name:'Workspace'}).getByRole('link',{name:'Transactions'}).click();await expect(page.getByRole('dialog',{name:'Workspace'})).toHaveCount(0);
 await page.screenshot({path:'artifacts/deployed-mobile.png',fullPage:true});expect(errors).toEqual([]);
});

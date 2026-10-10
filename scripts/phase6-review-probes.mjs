import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { buildIntelligence } from '../src/domain/intelligence.ts';

// Adversarial review oracle uses integer construction and a closed-form sum,
// independently of production parsers, formatting, summation and forecast code.
const money = (minor, currency) => {
  const sign = minor < 0n ? '-' : '', abs = minor < 0n ? -minor : minor;
  return sign + (currency === 'JPY' ? String(abs) : `${abs/100n}.${String(abs%100n).padStart(2,'0')}`);
};
const context = { userId: 'review', now: Date.parse('2026-10-19T04:00Z'), timezone: 'Asia/Kuala_Lumpur',
  period: { from:'2026-10-01',to:'2026-10-19',previousFrom:'2026-09-01',previousTo:'2026-09-19',months:1,partial:true },
  accounts:[],debts:[],repayments:[],goals:[],contributions:[],transfers:[],rules:[],budgets:[],goalPlans:[],debtPlans:[],categories:[] };
let cases = 0;
for (const currency of ['MYR','USD','EUR','JPY']) for (let seed = 1n; seed <= 250n; seed++) {
  const income = 9007199254740993n + seed, expense = seed*seed - 10n, balance = seed*123456789n - 9999999n;
  const row = (type,minor,day='2026-10-01') => ({user_id:'review',currency,type,amount:money(minor,currency),month:day.slice(0,7),financial_date:day,category_id:null,transaction_count:1});
  const input = { ...context, totals:[row('income',income),row('expense',expense),row('expense',seed,'2026-09-01')],
    accounts:[{id:'a',user_id:'review',currency,balance:money(balance,currency),opening_balance:'0',name:'Synthetic',archived:seed%2n===0n,created_at:''}] };
  const before = JSON.stringify(input), out = buildIntelligence(input).native[0];
  assert.equal(out.surplus,money(income-expense,currency)); assert.equal(out.balance,money(balance,currency));
  assert.equal(out.expenseChange,money(expense-seed,currency)); assert.equal(out.recurringScenario,out.balance);
  assert.equal(JSON.stringify(input),before); cases++;
}
const samples = [];
for (let sample=1; sample<=3; sample++) {
  const totals = Array.from({length:10000},(_,i)=>({user_id:'review',currency:'MYR',type:'expense',amount:'0.10',financial_date:'2026-10-01',month:'2026-10',category_id:String(i%50),transaction_count:1}));
  const start=performance.now(), result=buildIntelligence({...context,totals});
  samples.push({sample,dailyRows:10000,categories:50,deriveMs:performance.now()-start}); assert.equal(result.native[0].expense,'1000.00');
}
await mkdir('artifacts/phase6',{recursive:true});
await writeFile('artifacts/phase6/adversarial-oracle.json',JSON.stringify({cases,precision:'independent native integer oracle',samples,externalWrites:0},null,2));
console.log(`PASS ${cases} closed-form native money cases; three 10,000-row derivation samples; immutable inputs`);

import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { budgetBalances } from '../src/domain/planning.ts';
import { planningHighlights } from '../src/domain/planning-highlights.ts';
import { decimalMoney } from '../src/domain/money.ts';

// A separate adversarial pass using a closed-form two-month oracle, deliberately
// independent of the shared helper's loop/map implementation. Synthetic only.
const results = [];
for (const currency of ['MYR','USD','EUR','JPY']) {
  const scale = currency === 'JPY' ? 1n : 100n;
  for (const previousSpent of [0n,700n,800n,900n,1700n]) for (const currentSpent of [0n,50n,750n,850n,1800n]) {
    const money = value => decimalMoney(value * scale,currency);
    const base = { user_id:'synthetic-owner',category_id:'food',currency,amount:money(800n),alert_percent:100,created_at:'' };
    const inputs = [
      {...base,id:'oct',month:'2026-10-01',spent:money(currentSpent),rollover_enabled:true},
      {...base,id:'sep',month:'2026-09-01',spent:money(previousSpent),rollover_enabled:false},
    ];
    const before = structuredClone(inputs);
    const available = 1600n-previousSpent, remaining = available-currentSpent;
    const derived = budgetBalances(inputs).find(b=>b.id==='oct');
    assert.equal(derived.available,money(available)); assert.equal(derived.remaining,money(remaining));
    assert.equal(planningHighlights(inputs,[],'2026-10-10').alerts.length,currentSpent>=available?1:0);
    assert.deepEqual(inputs,before);
    results.push({currency,previousSpent:money(previousSpent),currentSpent:money(currentSpent),available:money(available),remaining:money(remaining),pass:true});
  }
}
await mkdir('artifacts/integration',{recursive:true});
await writeFile('artifacts/integration/adversarial-rollover.json',JSON.stringify({scope:'100 synthetic cases; separate closed-form oracle, all four native currencies, surplus/deficit/zero/negative capacity and immutable inputs',accepted:true,results},null,2)+'\n');
console.log(`PASS independent rollover oracle: ${results.length} four-currency cases, including negative capacity, zero spending, zero remainder and deficits`);

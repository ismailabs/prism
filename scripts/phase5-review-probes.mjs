import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {financialInstant,financialDateTime} from '../src/domain/dates.ts';
import {goalFunding} from '../src/domain/goal-actions.ts';
import {decimalMoney} from '../src/domain/money.ts';
import {financialTimeline,reminderOccurrences} from '../src/domain/actions.ts';

// Separate review oracles: the accepted wall-clock resolver and closed-form
// native integer funding sums. All inputs are invented local test fixtures.
function acceptedResolver(local,zone){
 const target=Date.parse(local+':00Z'),matches=[];
 for(let offset=-840;offset<=840;offset+=15){const candidate=target+offset*60000;if(financialDateTime(new Date(candidate),zone)===local)matches.push(candidate);}
 if(matches.length!==1)throw new Error('Rejected');return new Date(matches[0]).toISOString();
}
const resultOf=(resolve,local,zone)=>{try{return resolve(local,zone);}catch{return 'rejected';}};
const timeCases=[
 ['2026-12-31T23:30','Asia/Kuala_Lumpur'],['2027-01-01T00:15','Asia/Tokyo'],
 ['2026-03-08T02:30','America/New_York'],['2026-11-01T01:30','America/New_York'],
 ['2026-11-01T03:00','America/New_York'],['2026-10-25T01:30','Europe/London'],
 ['2026-04-05T01:45','Australia/Lord_Howe'],['2026-10-04T02:15','Australia/Lord_Howe'],
 ['2026-10-10T12:00','Asia/Kathmandu'],['2011-12-30T12:00','Pacific/Apia'],
 ['2028-02-29T00:00','America/Los_Angeles'],['2026-02-30T12:00','UTC'],
];
for(const [local,zone] of timeCases)assert.equal(resultOf(financialInstant,local,zone),resultOf(acceptedResolver,local,zone),`${local} ${zone}`);
let fundingCases=0;
for(const currency of ['MYR','USD','EUR','JPY'])for(let i=1n;i<=25n;i++){
 const unit=currency==='JPY'?1n:100n,money=n=>decimalMoney(n*unit,currency);
 const goal={id:'g',currency,target_amount:money(2000n)};
 const tx={id:'tx',currency,amount:money(50n),transaction_date:'2000-01-01T00:00Z'};
 const transfer={id:'t',destination_currency:currency,destination_amount:money(1000n+i),occurred_at:'2000-01-01T00:00Z'};
 const base={objective_id:'g',currency,contributed_at:'2000-01-01T00:00Z'};
 const rows=[{...base,transfer_id:'t',amount:money(999n)},{...base,transfer_id:'t',amount:money(999n)},{...base,amount:money(100n+i)},{...base,transaction_id:'tx',amount:null,effective_amount:money(50n)}];
 const before=structuredClone(rows),result=goalFunding(goal,rows,[tx],[transfer]);
 assert.equal(result.funded,money(1150n+2n*i));assert.equal(result.remaining,money(850n-2n*i));assert.deepEqual(rows,before);fundingCases++;
}
const reminder={id:'r',title:'Synthetic',due_local:'2026-01-01T12:00:00',timezone:'Asia/Kuala_Lumpur',frequency:'daily',interval:1,state:'open',archived:false,importance:'normal'};
const sources={transactions:[],reminders:Array.from({length:3},(_,i)=>({...reminder,id:String(i)})),notes:[],receipts:[],preferences:{reminders_enabled:true},goals:[],contributions:[],transfers:[],plans:[],debts:[],repayments:[],rules:[],budgets:[]};
const measurements=[];
for(let sample=0;sample<2;sample++){
 const start=performance.now(),expected=sources.reminders.flatMap(r=>reminderOccurrences(r,'2026-09-29','2026-11-02',acceptedResolver)).filter(r=>r.date>='2026-10-01'&&r.date<='2026-10-31');
 const beforeMs=performance.now()-start,afterStart=performance.now(),actual=financialTimeline(sources,'2026-10-01','2026-10-31','Asia/Kuala_Lumpur',Date.parse('2026-10-10'));
 const afterMs=performance.now()-afterStart;assert.equal(actual.length,93);assert.deepEqual(actual.map(r=>r.key).sort(),expected.map(r=>r.key).sort());
 measurements.push({sample,occurrences:93,beforeMs,afterMs});
}
await mkdir('artifacts/phase5',{recursive:true});
await writeFile('artifacts/phase5/independent-review.json',JSON.stringify({environment:'local synthetic probes; timings are diagnostic, not field performance',fundingCases,timeCases:timeCases.length,accepted:true,measurements},null,2)+'\n');
console.log(`PASS separate Phase 5 review: ${fundingCases} closed-form native funding cases; ${timeCases.length} accepted timezone/DST oracle cases; immutable inputs and equivalent occurrence keys; timings ${JSON.stringify(measurements)}`);

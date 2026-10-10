import type {FinancialReminder,FinancialNote,ActionReceipt,ActionPreferences,GoalActionPlan,LinkKind} from '../types/actions.ts';
import type {Objective,ObjectiveContribution,PersonDebt,DebtRepayment,RecurringRule,MonthlyBudget,Transaction,Transfer} from '../types/index.ts';
import {calendarDate,occurrenceDate,type RecurrenceRule} from './recurrence.ts';
import {financialDate,financialInstant,hasOccurred} from './dates.ts';
import {entityPath} from './action-links.ts';
import {goalFunding} from './goal-actions.ts';
import {decimalMoney,parseMoney} from './money.ts';
export type ActionStatus='Posted'|'Upcoming'|'Estimated'|'Overdue'|'Done';
export type ActionSource='transaction'|'reminder'|'recurring'|'debt'|'goal'|'budget'|'note';
export type TimelineItem={key:string;date:string;title:string;path:string;status:ActionStatus;source:ActionSource;amount?:string;currency?:Transaction['currency'];notify:boolean;read:boolean;importance:'normal'|'high';issue?:'dst';goalEvent?:'pace'|'target';context?:{kind:LinkKind;id:string}};
export type ActionSources={transactions:Transaction[];reminders:FinancialReminder[];notes:FinancialNote[];receipts:ActionReceipt[];preferences:Pick<ActionPreferences,'reminders_enabled'|'debt_enabled'|'recurring_enabled'|'goal_enabled'|'budget_enabled'>;goals:Objective[];contributions:ObjectiveContribution[];transfers:Transfer[];plans:GoalActionPlan[];debts:PersonDebt[];repayments:DebtRepayment[];rules:RecurringRule[];budgets:MonthlyBudget[]};
export function addDays(date:string,days:number){const value=calendarDate(date);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);}
export function monthRange(month:string){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Invalid calendar month.');const from=`${month}-01`,next=calendarDate(from);next.setUTCMonth(next.getUTCMonth()+1);return {from,to:addDays(next.toISOString().slice(0,10),-1),next:next.toISOString().slice(0,10)};}
/** Fetch a small UTC envelope, then filter each record by its real financial
 * date. A valid month must not require a nonexistent/ambiguous local midnight. */
export function timelineBounds(month:string){
 const {from,next}=monthRange(month),margin=2*86400000;
 return {lower:new Date(Date.parse(`${from}T00:00Z`)-margin).toISOString(),upper:new Date(Date.parse(`${next}T00:00Z`)+margin).toISOString()};
}
/** Jump near the requested calendar window while retaining the original anchor.
 * Avoid walking decades of old daily occurrences just to display one month. */
export function rangedOccurrences(rule:RecurrenceRule,from:string,to:string,startIndex=0):{date:string;index:number}[]{
 const anchor=calendarDate(rule.start),start=calendarDate(from);calendarDate(to);
 const months=(start.getUTCFullYear()-anchor.getUTCFullYear())*12+start.getUTCMonth()-anchor.getUTCMonth();
 const raw=rule.frequency==='monthly'?months:rule.frequency==='yearly'?Math.floor(months/12):Math.floor((start.getTime()-anchor.getTime())/86400000/(rule.frequency==='weekly'?7:1));
 const first=Math.max(startIndex,0,Math.floor(raw/rule.interval)-2),result:{date:string;index:number}[]=[];
 for(let index=first;index<=100000;index++){
  const date=occurrenceDate(rule,index);if(!date||date>to)return result;
  if(date>=from){result.push({date,index});if(result.length>1000)throw new Error('Narrow the reminder date range.');}
 }
 throw new Error('Occurrence exceeds the supported range.');
}
export function reminderOccurrences(reminder:FinancialReminder,from:string,to:string,resolve=financialInstant){
 const local=reminder.due_local.slice(0,16),date=local.slice(0,10),time=local.slice(11);
 const dates=reminder.frequency==='once'?(date>=from&&date<=to?[{date,index:0}]:[]):rangedOccurrences({start:date,frequency:reminder.frequency,interval:reminder.interval},from,to);
 return dates.map(({date,index})=>{const wall=`${date}T${time}`;let instant:string|null=null;try{instant=resolve(wall,reminder.timezone);}catch{/* Occurrence is visible as needing DST review, never shifted or delivered. */}
 return {date,index,wall,instant,key:`reminder:${reminder.id}:${wall}:${reminder.timezone}`};});
}
export function financialTimeline(s:ActionSources,from:string,to:string,timezone:string,now=Date.now()):TimelineItem[]{
 calendarDate(from);calendarDate(to);const today=financialDate(new Date(now),timezone),seen=new Set<string>(),items:TimelineItem[]=[];
 const receipts=new Map(s.receipts.map(r=>[r.occurrence_key,r.state])),instants=new Map<string,string>();
 const resolve=(wall:string,zone:string)=>{const key=wall+':'+zone;let value=instants.get(key);if(!value){value=financialInstant(wall,zone);instants.set(key,value);}return value;};
 function add(item:Omit<TimelineItem,'read'>){
  if(item.date<from||item.date>to||seen.has(item.key))return;
  seen.add(item.key);const state=item.source==='transaction'||item.source==='note'?undefined:receipts.get(item.key);
  items.push({...item,read:state!==undefined,status:state==='complete'||state==='dismissed'?'Done':item.status,notify:item.notify&&state!=='complete'&&state!=='dismissed'});
 }
 for(const t of s.transactions){const date=financialDate(t.transaction_date,timezone);add({key:`transaction:${t.id}`,date,title:t.description,path:entityPath('transaction',t.id),status:hasOccurred(t.transaction_date,now)?'Posted':'Estimated',source:'transaction',amount:t.amount,currency:t.currency,notify:false,importance:'normal',context:{kind:'transaction',id:t.id}});}
 for(const r of s.reminders){if(r.archived)continue;for(const occurrence of reminderOccurrences(r,from<'1900-01-03'?'1900-01-01':addDays(from,-2),addDays(to,2),resolve)){const date=occurrence.instant?financialDate(occurrence.instant,timezone):occurrence.date;add({key:occurrence.key,date,title:r.title,path:entityPath('reminder',r.id),status:r.state!=='open'?'Done':!occurrence.instant?'Estimated':Date.parse(occurrence.instant)<now?'Overdue':'Upcoming',source:'reminder',notify:s.preferences.reminders_enabled&&r.state==='open'&&!!occurrence.instant&&date<=addDays(today,7),importance:r.importance==='high'?'high':'normal',...(!occurrence.instant?{issue:'dst' as const}:{}),context:{kind:'reminder',id:r.id}});}}
 for(const r of s.rules){if(!r.active)continue;for(const {date,index} of rangedOccurrences({start:r.start_date,end:r.end_date,frequency:r.frequency,interval:r.interval},from,to,r.next_index)){add({key:`recurring:${r.id}:${index}:${date}:${timezone}`,date,title:r.description,path:'/plans?section=recurring&item='+encodeURIComponent(r.id),status:date<today?'Overdue':'Estimated',source:'recurring',amount:r.amount,currency:r.currency,notify:s.preferences.recurring_enabled&&date<=addDays(today,7),importance:'normal'});}}
 for(const d of s.debts){if(!d.due_date)continue;const paid=s.repayments.filter(r=>r.debt_id===d.id&&r.currency===d.currency&&hasOccurred(r.paid_at,now)).reduce((sum,r)=>sum+parseMoney(r.effective_amount??r.amount??'0',d.currency),0n);const gap=parseMoney(d.original_amount,d.currency)-paid;if(gap<=0n)continue;add({key:`debt:${d.id}:${d.due_date}:${timezone}`,date:d.due_date,title:d.counterparty,path:entityPath('debt',d.id),status:d.due_date<today?'Overdue':'Upcoming',source:'debt',amount:decimalMoney(gap,d.currency),currency:d.currency,notify:s.preferences.debt_enabled&&d.due_date<=addDays(today,7),importance:'high',context:{kind:'debt',id:d.id}});}
 for(const goal of s.goals){
  if(goal.status!=='active')continue;
  const funding=goalFunding(goal,s.contributions,s.transactions,s.transfers,now),plan=s.plans.find(p=>p.objective_id===goal.id);
  const events:{date:string;goalEvent:'target'|'pace';identity:string}[]=[];
  if(goal.target_date)events.push({date:goal.target_date,goalEvent:'target',identity:goal.id});
  if(plan)for(const occurrence of rangedOccurrences({start:plan.start_date,frequency:plan.frequency,interval:1},from,to))events.push({date:occurrence.date,goalEvent:'pace',identity:plan.id});
  for(const {date,goalEvent,identity} of events)add({key:`goal:${identity}:${goalEvent}:${date}:${timezone}`,date,title:goal.name,path:entityPath('goal',goal.id,goal.kind),status:funding.completed?'Done':date<today?'Overdue':'Estimated',source:'goal',goalEvent,amount:goalEvent==='pace'?plan!.cadence_amount:funding.remaining,currency:goal.currency,notify:s.preferences.goal_enabled&&!funding.completed&&date<=addDays(today,7),importance:goal.priority==='high'?'high':'normal',context:{kind:'goal',id:goal.id}});
 }
 for(const budget of s.budgets){const date=monthRange(budget.month.slice(0,7)).to;add({key:`budget:${budget.id}:${date}:${timezone}`,date,title:budget.month.slice(0,7),path:'/plans?section=budgets&item='+encodeURIComponent(budget.id),status:date<today?'Done':'Upcoming',source:'budget',notify:s.preferences.budget_enabled&&date>=today&&date<=addDays(today,7),importance:'normal',context:{kind:'budget',id:budget.id}});}
 for(const note of s.notes){if(note.archived)continue;add({key:`note:${note.id}`,date:financialDate(note.updated_at,timezone),title:note.title,path:'/notes?note='+encodeURIComponent(note.id),status:'Done',source:'note',notify:false,importance:'normal'});}
 return items.sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
}
function previousOccurrence(rule:RecurrenceRule,through:string,startIndex=0){
 const anchor=calendarDate(rule.start),date=calendarDate(through),months=(date.getUTCFullYear()-anchor.getUTCFullYear())*12+date.getUTCMonth()-anchor.getUTCMonth();
 const raw=rule.frequency==='monthly'?months:rule.frequency==='yearly'?Math.floor(months/12):Math.floor((date.getTime()-anchor.getTime())/86400000/(rule.frequency==='weekly'?7:1));
 let latest:string|null=null;
 for(let i=Math.max(startIndex,0,Math.floor(raw/rule.interval)-2);i<=Math.max(startIndex,Math.floor(raw/rule.interval)+2);i++){const day=occurrenceDate(rule,i);if(!day||day>through)break;latest=day;}
 return latest;
}
/** Pure app-open derivation. Repeated refreshes do not insert notifications.
 * Old one-off obligations and the latest older recurring occurrence remain
 * visible without materializing decades of historical reminder backlog. */
export function notificationCandidates(s:ActionSources,timezone:string,now=Date.now()){
 const today=financialDate(new Date(now),timezone),from=addDays(today,-7),to=addDays(today,7),dates=new Set<string>();
 for(const r of s.reminders){if(r.archived||r.state!=='open')continue;const day=r.frequency==='once'?r.due_local.slice(0,10):previousOccurrence({start:r.due_local.slice(0,10),frequency:r.frequency,interval:r.interval},financialDate(new Date(now),r.timezone));if(day){try{const displayDay=financialDate(financialInstant(`${day}T${r.due_local.slice(11,16)}`,r.timezone),timezone);if(displayDay<from)dates.add(displayDay);}catch{/* DST review remains in the monthly calendar. */}}}
 for(const d of s.debts)if(d.due_date&&d.due_date<from)dates.add(d.due_date);
 for(const g of s.goals)if(g.target_date&&g.target_date<from)dates.add(g.target_date);
 for(const p of s.plans){const day=previousOccurrence({start:p.start_date,frequency:p.frequency,interval:1},today);if(day&&day<from)dates.add(day);}
 for(const r of s.rules){if(!r.active)continue;const day=previousOccurrence({start:r.start_date,end:r.end_date,frequency:r.frequency,interval:r.interval},today,r.next_index);if(day&&day<from)dates.add(day);}
 const input={...s,transactions:[],notes:[]},items=financialTimeline(input,from,to,timezone,now);
 for(const date of dates)items.push(...financialTimeline(input,date,date,timezone,now));
 return [...new Map(items.filter(i=>i.notify).map(i=>[i.key,i])).values()].sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
}

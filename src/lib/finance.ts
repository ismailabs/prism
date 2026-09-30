import {browserTimezone,financialDate} from '@/domain/dates';
import {decimalMoney,parseMoney} from '@/domain/money';
import {convertCurrency} from '@/services/currency';
import type {Category,Currency,ExchangeRates,Transaction} from '@/types';
export interface FinanceSummary {income:number;expense:number;balance:number;savingsRate:number;monthlyIncome:number;monthlyExpense:number;dailySpending:number;projectedMonthlyExpense:number;previousMonthlyExpense:number;spendingChangePercent:number|null}
export interface MonthlyCashFlow {key:string;month:string;income:number;expense:number}
export interface CategoryBreakdown {id:string;name:string;color:string;value:number}
const monthKey=(date:Date,zone:string)=>financialDate(date,zone).slice(0,7);
const ordinary=(rows:Transaction[],now:Date)=>rows.filter(t=>(!t.activity_kind||t.activity_kind==='ordinary')&&new Date(t.transaction_date)<=now);
/** Compatibility chart helpers aggregate native bigint amounts first. Their number
 * results are presentation estimates; persisted money uses domain/dashboard.ts. */
function displaySum(rows:Transaction[],currency:Currency,rates:ExchangeRates|null){const native=new Map<Currency,bigint>();for(const t of rows)native.set(t.currency,(native.get(t.currency)??0n)+parseMoney(t.amount,t.currency));return [...native].reduce((sum,[from,minor])=>sum+convertCurrency(decimalMoney(minor,from),from,currency,rates),0);}
export function summarizeTransactions(transactions:Transaction[],currency:Currency,rates:ExchangeRates|null,now=new Date(),timezone=browserTimezone()):FinanceSummary{
 const currentMonth=monthKey(now,timezone);const anchor=new Date(currentMonth+'-01T00:00:00Z');anchor.setUTCMonth(anchor.getUTCMonth()-1);const previousMonth=anchor.toISOString().slice(0,7);const rows=ordinary(transactions,now);
 const sum=(type:string,month?:string)=>displaySum(rows.filter(t=>t.type===type&&(!month||monthKey(new Date(t.transaction_date),timezone)===month)),currency,rates);
 const income=sum('income'),expense=sum('expense'),monthlyIncome=sum('income',currentMonth),monthlyExpense=sum('expense',currentMonth),previousMonthlyExpense=sum('expense',previousMonth);
 const today=financialDate(now,timezone);const day=Number(today.slice(8));const [year,index]=currentMonth.split('-').map(Number);const days=new Date(Date.UTC(year,index,0)).getUTCDate();const dailySpending=monthlyExpense/day;
 return {income,expense,balance:income-expense,savingsRate:monthlyIncome?((monthlyIncome-monthlyExpense)/monthlyIncome)*100:0,monthlyIncome,monthlyExpense,dailySpending,projectedMonthlyExpense:dailySpending*days,previousMonthlyExpense,spendingChangePercent:previousMonthlyExpense?((monthlyExpense-previousMonthlyExpense)/previousMonthlyExpense)*100:null};
}
export function getMonthlyCashFlow(transactions:Transaction[],currency:Currency,rates:ExchangeRates|null,months=6,now=new Date(),locale='en',timezone=browserTimezone()):MonthlyCashFlow[]{
 if(!Number.isInteger(months)||months<1||months>120)throw new Error('Month count must be between 1 and 120.');const [year,month]=monthKey(now,timezone).split('-').map(Number);const rows=ordinary(transactions,now);
 return Array.from({length:months},(_,index)=>{const date=new Date(Date.UTC(year,month-months+index,1));const key=date.toISOString().slice(0,7);const selected=rows.filter(t=>monthKey(new Date(t.transaction_date),timezone)===key);return {key,month:date.toLocaleDateString(locale==='ms'?'ms-MY':'en-US',{month:'short',timeZone:'UTC'}),income:displaySum(selected.filter(t=>t.type==='income'),currency,rates),expense:displaySum(selected.filter(t=>t.type==='expense'),currency,rates)};});
}
export function getCategoryBreakdown(transactions:Transaction[],categories:Category[],currency:Currency,rates:ExchangeRates|null,month=new Date(),timezone=browserTimezone()):CategoryBreakdown[]{
 const buckets=new Map<string,{category:Category|undefined;rows:Transaction[]}>();for(const t of ordinary(transactions,month)){if(t.type!=='expense'||monthKey(new Date(t.transaction_date),timezone)!==monthKey(month,timezone))continue;const category=categories.find(c=>c.id===t.category_id);const id=category?.id??'uncategorized';const bucket=buckets.get(id)??{category,rows:[]};bucket.rows.push(t);buckets.set(id,bucket);}return [...buckets].map(([id,b])=>({id,name:b.category?.name??'Uncategorized',color:b.category?.color??'#94a3b8',value:displaySum(b.rows,currency,rates)})).sort((a,b)=>b.value-a.value);
}
export interface OptimisticOperation<T> { token: string; apply: (rows: T[]) => T[] }

/** Replays queued edits over confirmed data so a failed earlier write cannot erase a later edit. */
export class OptimisticLedger<T> {
  private confirmed: T[];
  private pending: OptimisticOperation<T>[] = [];
  constructor(rows: T[]) { this.confirmed = rows; }
  add(operation: OptimisticOperation<T>): T[] { this.pending.push(operation); return this.value(); }
  settle(token: string, commit?: (rows: T[]) => T[]): T[] {
    if (commit) this.confirmed = commit(this.confirmed);
    this.pending = this.pending.filter((operation) => operation.token !== token);
    return this.value();
  }
  value(): T[] { return this.pending.reduce((rows, operation) => operation.apply(rows), this.confirmed); }
  get pendingCount(): number { return this.pending.length; }
}

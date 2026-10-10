import type {ActionLink,FinancialNote,LinkKind} from '../types/actions.ts';
export const emptyActionLink:ActionLink={transaction_id:null,account_id:null,debt_id:null,objective_id:null,budget_id:null,period_month:null};
export function linkFields(kind:LinkKind| '',id:string):ActionLink & {reminder_id:string|null}{
 const result:ActionLink & {reminder_id:string|null}={...emptyActionLink,reminder_id:null};
 if(!kind||!id)return result;
 const key={transaction:'transaction_id',account:'account_id',debt:'debt_id',goal:'objective_id',budget:'budget_id',reminder:'reminder_id',period:'period_month'} as const;
 result[key[kind]]=id;return result;
}
export function linkedEntity(row:ActionLink & {reminder_id?:string|null}):{kind:LinkKind;id:string}|null{
 for(const kind of ['transaction','account','debt','goal','budget','reminder','period'] as const){const key={transaction:'transaction_id',account:'account_id',debt:'debt_id',goal:'objective_id',budget:'budget_id',reminder:'reminder_id',period:'period_month'} as const;const value=row[key[kind] as keyof typeof row];if(value)return {kind,id:value};}return null;
}
export function entityPath(kind:LinkKind,id:string,goalKind='goal'){
 const paths={transaction:'transactions',account:'accounts',debt:'debts',goal:goalKind==='savings'?'savings':'goals',budget:'plans',reminder:'reminders',period:'calendar'};
 return `/${paths[kind]}?${new URLSearchParams(kind==='period'?{month:id}:kind==='budget'?{section:'budgets',item:id}:{item:id})}`;
}
export function notePath(kind:LinkKind,id:string){return `/notes?${new URLSearchParams({entity:kind,item:id})}`;}
export function noteInput(note:FinancialNote){const {id:userIgnoredId,user_id:userIgnoredOwner,created_at:ignoredCreated,updated_at:ignoredUpdated,...input}=note;void userIgnoredId;void userIgnoredOwner;void ignoredCreated;void ignoredUpdated;return input;}
export function parseTags(value:string){const tags=[...new Set(value.split(',').map(t=>t.trim().toLocaleLowerCase()).filter(Boolean))];if(tags.length>8||tags.some(t=>t.length>32||!/^[\p{L}\p{N} _-]+$/u.test(t)))throw new Error('Use up to eight plain tags, each at most 32 characters.');return tags;}

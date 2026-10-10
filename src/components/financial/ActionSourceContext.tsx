import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/lib/supabase';
import type {Tab,Currency} from '@/types';
import type {LinkKind} from '@/types/actions';
import {notePath,entityPath} from '@/domain/action-links';
import {navigatePath} from '@/lib/routes';
import {useAppStore} from '@/store/useAppStore';
import {Failure,money,useFinancialCopy} from './shared';
type Detail={title:string;body:string;kind:LinkKind|'note'|'recurring';amount?:string;currency?:Currency;goalKind?:string};
/** Owner-scoped lookup makes source deep links work beyond list page limits.
 * It remains a read-only context panel, separate from existing posting forms. */
export default function ActionSourceContext({tab}:{tab:Tab}){
 const c=useFinancialCopy(),privacy=useAppStore(s=>s.personalization.privacyMode),{user,loading,requiresMfa}=useAuth(),params=new URLSearchParams(window.location.search),item=tab==='notes'?params.get('note'):params.get('item'),section=params.get('section');
 const kind=tab==='transactions'?'transaction':tab==='accounts'?'account':tab==='debts'?'debt':tab==='goals'||tab==='savings'?'goal':tab==='plans'&&section==='budgets'?'budget':tab==='plans'&&section==='recurring'?'recurring':tab==='reminders'?'reminder':tab==='notes'?'note':null;
 const detail=useQuery({queryKey:['platform',user?.id,'action-source',kind,item],enabled:!!item&&!!kind&&!!user&&!loading&&!requiresMfa,queryFn:async({signal}):Promise<Detail|null>=>{
  if(!user||!item)throw new Error('Verified session required.');
  if(kind==='transaction'){const {data,error}=await supabase.from('exact_transactions').select('*').eq('user_id',user.id).eq('id',item).abortSignal(signal).maybeSingle();if(error)throw error;return data?{title:data.description,body:data.transaction_date,kind,amount:data.amount,currency:data.currency}:null;}
  if(kind==='account'){const {data,error}=await supabase.from('exact_accounts').select('*').eq('user_id',user.id).eq('id',item).abortSignal(signal).maybeSingle();if(error)throw error;return data?{title:data.name,body:data.archived?c('Archived account','Akaun diarkib'):c('Account balance','Baki akaun'),kind,amount:data.balance,currency:data.currency}:null;}
  if(kind==='debt'){const {data,error}=await supabase.from('exact_person_debts').select('*').eq('user_id',user.id).eq('id',item).abortSignal(signal).maybeSingle();if(error)throw error;return data?{title:data.counterparty,body:data.notes,kind}:null;}
  if(kind==='goal'){const {data,error}=await supabase.from('exact_objectives').select('*').eq('user_id',user.id).eq('id',item).abortSignal(signal).maybeSingle();if(error)throw error;return data?{title:data.name,body:data.notes,kind,goalKind:data.kind}:null;}
  if(kind==='budget'){const {data,error}=await supabase.from('exact_monthly_budgets').select('*').eq('user_id',user.id).eq('id',item).abortSignal(signal).maybeSingle();if(error)throw error;return data?{title:data.month,body:c('Budget allocation','Peruntukan bajet'),kind,amount:data.amount,currency:data.currency}:null;}
  if(kind==='recurring'){const {data,error}=await supabase.from('exact_recurring_rules').select('*').eq('user_id',user.id).eq('id',item).abortSignal(signal).maybeSingle();if(error)throw error;return data?{title:data.description,body:c('Anticipated recurring activity; money requires explicit confirmation.','Aktiviti berulang dijangka; wang memerlukan pengesahan nyata.'),kind,amount:data.amount,currency:data.currency}:null;}
  if(kind==='reminder'){const {data,error}=await supabase.from('financial_reminders').select('*').eq('user_id',user.id).eq('id',item).abortSignal(signal).maybeSingle();if(error)throw error;return data?{title:data.title,body:`${data.due_local} · ${data.timezone}`,kind}:null;}
  if(kind==='note'){const {data,error}=await supabase.from('financial_notes').select('*').eq('user_id',user.id).eq('id',item).abortSignal(signal).maybeSingle();if(error)throw error;return data?{title:data.title,body:data.body,kind}:null;}
  return null;
 }});
 if(!item||!kind)return null;
 if(detail.error)return <Failure error={detail.error} retry={()=>void detail.refetch()}/>;
 if(detail.isPending)return <p role="status">{c('Loading linked context…','Memuatkan konteks berpaut…')}</p>;
 if(!detail.data)return <p className="card p-4" role="status">{c('Linked record is unavailable. It may have been removed or belongs to another account.','Rekod berpaut tidak tersedia. Ia mungkin telah dibuang atau milik akaun lain.')}</p>;
 const row=detail.data;
 return <section className="card p-5 mb-5 space-y-2" aria-label={c('Linked financial context','Konteks kewangan berpaut')}><h2 className="font-semibold">{privacy?c('Private context','Konteks peribadi'):row.title}</h2><p className="whitespace-pre-wrap break-words">{privacy?c('Hidden in privacy mode','Disembunyikan dalam mod privasi'):row.body}</p>{row.amount&&row.currency&&<p>{money(row.amount,row.currency)}</p>}{row.kind!=='note'&&row.kind!=='recurring'&&<a className="text-link" href={notePath(row.kind,item)} onClick={e=>{e.preventDefault();navigatePath(notePath(row.kind as LinkKind,item));}}>{c('Add contextual note','Tambah nota berkonteks')}</a>}{row.goalKind&&(tab==='goals'&&row.goalKind==='savings'||tab==='savings'&&row.goalKind==='goal')&&<a className="text-link" href={entityPath('goal',item,row.goalKind)} onClick={e=>{e.preventDefault();navigatePath(entityPath('goal',item,row.goalKind));}}>{c('Open target detail','Buka butiran sasaran')}</a>}</section>;
}

import { useState, type FormEvent } from 'react';
import type { Account, Objective } from '@/types';
import { useGoalActions } from '@/hooks/useGoalActions';
import { goalProjection } from '@/domain/goal-actions';
import { financialDate } from '@/domain/dates';
import { useAppStore } from '@/store/useAppStore';
import { errorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Failure, money, positive, useFinancialCopy } from './shared';

export function GoalActionPlan({goal,remaining,accounts}:{goal:Objective;remaining:string;accounts:Account[]}) {
  const c=useFinancialCopy(), timezone=useAppStore(s=>s.financialTimezone), actions=useGoalActions();
  const plan=actions.plans.data?.find(p=>p.objective_id===goal.id);
  const [amount,setAmount]=useState(''),[account,setAccount]=useState(''),[frequency,setFrequency]=useState<'weekly'|'monthly'>('monthly'),[start,setStart]=useState(financialDate(new Date(),timezone));
  const [editing,setEditing]=useState(false);
  const busy=actions.save.isPending||actions.remove.isPending;
  async function save(event:FormEvent){event.preventDefault();try{await actions.save.mutateAsync({objective_id:goal.id,account_id:account||null,currency:goal.currency,cadence_amount:amount,frequency,start_date:start});setEditing(false);}catch(error){toast.error(errorMessage(error));}}
  if(actions.plans.error)return <Failure error={actions.plans.error} retry={()=>void actions.plans.refetch()}/>;
  if(actions.plans.isPending)return <p role="status">{c('Loading contribution plan…','Memuatkan pelan sumbangan…')}</p>;
  const projection=plan?goalProjection(remaining,plan,financialDate(new Date(),timezone)):null;
  return <section className="mt-6 space-y-3" aria-label={c('Contribution plan','Pelan sumbangan')}>
    <h3 className="font-semibold">{c('Contribution plan','Pelan sumbangan')}</h3>
    <p className="text-sm text-subtle">{c('Planning only. Earmarks may overlap across goals and are not additive funded cash. Account balances do not establish goal ownership.','Perancangan sahaja. Peruntukan boleh bertindih antara matlamat dan bukan tunai dibiayai yang boleh dijumlahkan. Baki akaun tidak menentukan pemilikan matlamat.')}</p>
    {plan&&<p className="text-sm">{money(plan.cadence_amount,goal.currency)} · {plan.frequency==='weekly'?c('Weekly','Mingguan'):c('Monthly','Bulanan')} · {accounts.find(a=>a.id===plan.account_id)?.name??c('No linked account','Tiada akaun berpaut')}</p>}
    {plan&&<p role="status" className="text-sm">{projection?`${c('Estimated completion','Anggaran siap')}: ${projection}`:c('No completion estimate: target reached or beyond the 1,200 occurrence forecast limit.','Tiada anggaran siap: sasaran dicapai atau melebihi had ramalan 1,200 kejadian.')}</p>}
    {plan&&<p className="text-xs text-subtle">{c('Assumes every planned contribution occurs, with no interest or withdrawal. This estimate never records money.','Mengandaikan setiap sumbangan dirancang berlaku, tanpa faedah atau pengeluaran. Anggaran ini tidak merekodkan wang.')}</p>}
    {!editing?<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={goal.status==='archived'} onClick={()=>{setAmount(plan?.cadence_amount??'');setAccount(plan?.account_id??'');setFrequency(plan?.frequency??'monthly');setStart(plan?.start_date??financialDate(new Date(),timezone));setEditing(true);}}>{plan?c('Edit contribution plan','Sunting pelan sumbangan'):c('Plan contributions','Rancang sumbangan')}</Button>{plan&&<Button variant="outline" disabled={busy} onClick={()=>void actions.remove.mutateAsync(plan.id).catch(e=>toast.error(errorMessage(e)))}>{c('Remove plan','Buang pelan')}</Button>}</div>:<form className="space-y-3" onSubmit={e=>void save(e)}>
      <label className="form-field">{c('Planned amount','Amaun dirancang')}<input className="input" inputMode="decimal" required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      <label className="form-field">{c('Cadence','Kekerapan')}<select className="input" value={frequency} onChange={e=>setFrequency(e.target.value as 'weekly'|'monthly')}><option value="weekly">{c('Weekly','Mingguan')}</option><option value="monthly">{c('Monthly','Bulanan')}</option></select></label>
      <label className="form-field">{c('First planned date','Tarikh dirancang pertama')}<input className="input" type="date" min="1900-01-01" max="9998-12-31" required value={start} onChange={e=>setStart(e.target.value)}/></label>
      <label className="form-field">{c('Linked savings account','Akaun simpanan berpaut')}<select className="input" value={account} onChange={e=>setAccount(e.target.value)}><option value="">{c('Unassigned','Tidak ditetapkan')}</option>{accounts.filter(a=>!a.archived&&a.currency===goal.currency).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <div className="flex gap-2"><Button disabled={busy||!positive(amount,goal.currency)}>{c('Save plan','Simpan pelan')}</Button><Button variant="outline" type="button" onClick={()=>setEditing(false)}>{c('Cancel','Batal')}</Button></div>
    </form>}
  </section>;
}

import {useState} from 'react';
import {notificationCandidates} from '@/domain/actions';
import {financialDate} from '@/domain/dates';
import {useActionTimeline,useActionClock} from '@/hooks/useActionTimeline';
import {useActionMutations} from '@/hooks/useActionData';
import {useAppStore} from '@/store/useAppStore';
import {errorMessage} from '@/lib/utils';
import {toast} from 'sonner';
import {Button} from '../ui/button';
import {Failure,useFinancialCopy} from './shared';
import {ActionTimelineList} from './ActionTimelineList';
import type {ActionPreferences} from '@/types/actions';
export default function Notifications(){
 const c=useFinancialCopy(),now=useActionClock(),zone=useAppStore(s=>s.financialTimezone),data=useActionTimeline(financialDate(new Date(now),zone).slice(0,7),false),actions=useActionMutations(),[page,setPage]=useState(1);
 const [draft,setDraft]=useState<Pick<ActionPreferences,'reminders_enabled'|'debt_enabled'|'recurring_enabled'|'budget_enabled'|'goal_enabled'>|null>(null);
 let items:ReturnType<typeof notificationCandidates>=[],derivationError:unknown=null;try{items=notificationCandidates(data.sources,zone,now);}catch(error){derivationError=error;}
 const prefs=draft??data.sources.preferences,options={reminders_enabled:c('Manual reminders','Peringatan manual'),debt_enabled:c('Debt due dates','Tarikh akhir hutang'),recurring_enabled:c('Recurring expectations','Jangkaan berulang'),budget_enabled:c('Budget endings','Akhir bajet'),goal_enabled:c('Goal pace','Kadar matlamat')};
 return <div className="space-y-5"><div className="feature-intro"><p className="text-sm text-subtle">{c('In-app attention from current sources. Read, complete and dismiss states are private and never post money. Refresh recalculates amounts and dates.','Perhatian dalam aplikasi daripada sumber semasa. Keadaan dibaca, selesai dan ditolak adalah peribadi dan tidak merekodkan wang. Muat semula mengira semula amaun dan tarikh.')}</p><Button variant="outline" onClick={()=>void data.refresh()}>{c('Refresh notices','Muat semula notis')}</Button></div><section className="card p-4 space-y-3" aria-label={c('Notification preferences','Pilihan pemberitahuan')}><h2 className="font-semibold">{c('Notification preferences','Pilihan pemberitahuan')}</h2>{(Object.keys(options) as (keyof typeof options)[]).map(key=><label className="flex items-center gap-2" key={key}><input type="checkbox" checked={prefs[key]} disabled={actions.preferences.isPending||!!data.error||data.pending} onChange={e=>{setPage(1);const values={...prefs,[key]:e.target.checked};setDraft(values);void actions.preferences.mutateAsync(values).catch(error=>toast.error(errorMessage(error))).finally(()=>setDraft(null));}}/>{options[key]}</label>)}</section>
 {data.error||derivationError?<Failure error={data.error||derivationError} retry={()=>void data.refresh()}/>:data.pending?<p role="status">{c('Loading notifications…','Memuatkan pemberitahuan…')}</p>:<><p role="status">{items.length} {c('open notices','notis terbuka')}</p><ActionTimelineList notifications items={items.slice((page-1)*25,page*25)}/></>}
 <nav className="flex gap-3 items-center" aria-label={c('Notification pagination','Halaman pemberitahuan')}><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>{c('Previous','Sebelumnya')}</Button><span>{c('Page','Halaman')} {page}</span><Button variant="outline" disabled={page*25>=items.length} onClick={()=>setPage(p=>p+1)}>{c('Next','Seterusnya')}</Button></nav>
 </div>;
}

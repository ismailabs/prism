import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import type { Category, Currency, NewTransaction, PaymentMethod, Transaction, TransactionType } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useTransactionMutations } from '@/hooks/useFinanceData';
import { errorMessage } from '@/lib/utils';
import { decimalMoney, parseMoney } from '@/domain/money';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';

export interface TransactionDialogProps { open:boolean; onOpenChange:(open:boolean)=>void; transaction:Transaction|null; categories:Category[]; payments:PaymentMethod[] }
function localDateInput(date:Date):string { return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16); }
export function TransactionDialog({open,onOpenChange,transaction,categories,payments}:TransactionDialogProps) {
  const { t } = useTranslation();
  return <Modal open={open} onOpenChange={onOpenChange} title={t(transaction?'editTransaction':'addTransaction')}><TransactionForm key={transaction?.id??String(open)} transaction={transaction} categories={categories} payments={payments} onClose={()=>onOpenChange(false)}/></Modal>;
}
interface TransactionFormProps { transaction:Transaction|null; categories:Category[]; payments:PaymentMethod[]; onClose:()=>void }
function TransactionForm({transaction,categories,payments,onClose}:TransactionFormProps) {
  const {t}=useTranslation();const baseCurrency=useAppStore(s=>s.currency);const mutations=useTransactionMutations();
  const [type,setType]=useState<TransactionType>(transaction?.type??'expense');
  const [amount,setAmount]=useState(transaction?.amount??'');const [currency,setCurrency]=useState<Currency>(transaction?.currency??baseCurrency);
  const [description,setDescription]=useState(transaction?.description??'');const [categoryId,setCategoryId]=useState(transaction?.category_id??'');const [paymentId,setPaymentId]=useState(transaction?.payment_method_id??'');
  const [date,setDate]=useState(localDateInput(transaction?new Date(transaction.transaction_date):new Date()));const [error,setError]=useState('');
  const busy=mutations.create.isPending||mutations.update.isPending;
  async function submit(event:FormEvent<HTMLFormElement>) {event.preventDefault();setError('');let exactAmount:string;try{const minor=parseMoney(amount,currency);if(minor<=0n)throw new Error('positive');exactAmount=decimalMoney(minor,currency);}catch{setError(t('invalidAmount'));return;}if(Number.isNaN(new Date(date).getTime()))return;
    const input:NewTransaction={type,amount:exactAmount,currency,description:description.trim(),category_id:categoryId||null,payment_method_id:paymentId||null,transaction_date:new Date(date).toISOString()};
    try{if(transaction)await mutations.update.mutateAsync({id:transaction.id,...input});else await mutations.create.mutateAsync(input);toast.success(t('transactionSaved'));onClose();}catch(err){setError(errorMessage(err));}
  }
  return <form onSubmit={e=>void submit(e)} className="space-y-5"><p className="-mt-3 text-sm text-subtle">{t('transactionDetail')}</p><div className="type-toggle">{(['expense','income'] as const).map(value=><button type="button" key={value} onClick={()=>{setType(value);setCategoryId('');}} aria-pressed={type===value} className={type===value?'active':''}>{value==='income'?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>} {t(value)}</button>)}</div><div className="grid grid-cols-1 min-[360px]:grid-cols-[minmax(0,1fr)_110px] gap-3"><label className="form-field">{t('amount')}<input autoFocus className="input text-xl font-semibold" type="number" min="0.01" step="0.01" max="999999999999" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" required/></label><label className="form-field">{t('currency')}<select className="input" value={currency} onChange={e=>setCurrency(e.target.value as Currency)}>{['USD','EUR','JPY','MYR'].map(c=><option key={c}>{c}</option>)}</select></label></div><label className="form-field">{t('description')}<input className="input" value={description} onChange={e=>setDescription(e.target.value)} maxLength={500} placeholder={t('description')}/></label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="form-field">{t('category')}<select className="input" value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">{t('uncategorized')}</option>{categories.filter(c=>c.type===type).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="form-field">{t('paymentMethod')}<select className="input" value={paymentId} onChange={e=>setPaymentId(e.target.value)}><option value="">{t('noPayment')}</option>{payments.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><label className="form-field">{t('date')}<input className="input" type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} required/></label>{error&&<p role="alert" className="error-message">{error}</p>}<div className="modal-actions border-t border-border pt-5"><Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button><Button disabled={busy} type="submit">{busy&&<Loader2 size={15} className="animate-spin"/>}{busy?t('saving'):transaction?t('save'):t('addTransaction')}</Button></div></form>;
}


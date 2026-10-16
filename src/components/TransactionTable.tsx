import { categoryColor } from '@/domain/analytics';
import { formatCurrency } from '@/services/currency';
import { useAppStore } from '@/store/useAppStore';
import { usePlatformTable } from '@/hooks/usePlatformData';
import type { Category,PaymentMethod,Transaction } from '@/types';
import { MoreHorizontal,Pencil,ReceiptText,Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { ActivityIcon, activitySemantic } from './ActivityIcon';
import { Button } from './ui/button';
import { MoneyText } from './MoneyText';

export interface TransactionTableProps { transactions: Transaction[]; categories: Category[]; payments: PaymentMethod[]; onEdit: (transaction: Transaction) => void; onDelete: (transaction: Transaction) => void; compact?: boolean; emptyKind?: 'unrecorded' | 'filtered' }
function TransactionActions({ transaction, onEdit, onDelete }: { transaction: Transaction } & Pick<TransactionTableProps, 'onEdit' | 'onDelete'>) {
  const { t } = useTranslation();
  return <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button variant="ghost" size="icon" aria-label={`${t('actions')}: ${transaction.description}`}><MoreHorizontal size={18} /></Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="end" collisionPadding={16} className="dropdown-menu"><DropdownMenu.Item onSelect={() => onEdit(transaction)} className="dropdown-item"><Pencil size={14} />{t('edit')}</DropdownMenu.Item><DropdownMenu.Item onSelect={() => onDelete(transaction)} className="dropdown-item text-red-600"><Trash2 size={14} />{t('delete')}</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}
export function TransactionTable({ transactions, categories, payments, onEdit, onDelete, compact = false, emptyKind = compact ? 'unrecorded' : 'filtered' }: TransactionTableProps) {
  const { t } = useTranslation();
  const locale = useAppStore(s => s.locale);
  const preferences=useAppStore(s=>s.personalization);
  const timezone=useAppStore(s=>s.financialTimezone);
  const accounts = usePlatformTable('accounts');
  const account = (tx: Transaction) => tx.account_id ? accounts.data?.find(a => a.id === tx.account_id)?.name ?? (locale === 'ms' ? 'Akaun tidak tersedia' : 'Account unavailable') : t('unassigned');
  if (!transactions.length) return <div className="empty-state"><div className="empty-icon"><ReceiptText size={24} /></div><h3>{emptyKind === 'unrecorded' ? (locale === 'ms' ? 'Belum ada transaksi direkodkan' : 'No transactions recorded yet') : t('noResults')}</h3><p>{emptyKind === 'unrecorded' ? (locale === 'ms' ? 'Tambah transaksi pertama atau import rekod anda untuk bermula.' : 'Add your first transaction or import your records to get started.') : t('noResultsDescription')}</p></div>;
  const date = (tx: Transaction) => preferences.dateFormat==='iso' ? (tx.financial_date ?? new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(tx.transaction_date))) : new Intl.DateTimeFormat(locale === 'ms' ? 'ms-MY' : 'en-US', { timeZone:timezone, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(tx.transaction_date));
  const amount = (tx: Transaction) => `${tx.type === 'income' ? '+' : '−'}${formatCurrency(tx.amount, tx.currency, locale)}`;
  return <>
    <ul className="divide-y divide-border sm:hidden" aria-label={t('allTransactions')}>
      {transactions.map(tx => <li key={tx.id} className="space-y-3 p-4">
        <div className="transaction-mobile-row"><ActivityIcon kind={activitySemantic(tx)}/><div className="transaction-mobile-main"><p className="text-sm font-medium [overflow-wrap:anywhere]">{tx.description || t(tx.type)}</p><p className="mt-1 text-xs text-subtle">{date(tx)} · {account(tx)}</p><span className="category-badge mt-2"><span aria-hidden="true" className="category-dot h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: categoryColor(tx.category_id,categories) }} /><span>{categories.find(c => c.id === tx.category_id)?.name ?? t('uncategorized')}</span></span></div><div className="transaction-mobile-value"><p className={`text-sm font-semibold tabular-nums [overflow-wrap:anywhere] ${'transaction-'+activitySemantic(tx)}`}><MoneyText fit text={amount(tx)} /></p><small>{t(tx.activity_kind&&tx.activity_kind!=='ordinary'?tx.activity_kind:tx.type)}</small><TransactionActions transaction={tx} onEdit={onEdit} onDelete={onDelete} /></div></div>
        {!compact && <details className="transaction-details"><summary>{t('details')}</summary><dl className="mt-3 space-y-2 text-xs">{[
          [t('category'), categories.find(c => c.id === tx.category_id)?.name ?? t('uncategorized')],
          [t('paymentMethod'), payments.find(p => p.id === tx.payment_method_id)?.name ?? t('noPayment')],
          [t('accounts'), account(tx)],
          [t('date'), date(tx)],
        ].map(([label, value]) => <div key={label} className="grid grid-cols-2 gap-3"><dt className="text-subtle">{label}</dt><dd className="min-w-0 text-right [overflow-wrap:anywhere]">{value}</dd></div>)}</dl></details>}
      </li>)}
    </ul>
    <div className="relative hidden w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain sm:block" tabIndex={0} role="region" aria-label={t('allTransactions')}>
      <table className="finance-table"><thead><tr><th>{t('description')}</th><th>{t('category')}</th>{!compact && <><th>{t('paymentMethod')}</th><th>{t('accounts')}</th></>}<th>{t('date')}</th><th className="text-right">{t('amount')}</th><th><span className="sr-only">{t('actions')}</span></th></tr></thead><tbody>{transactions.map(tx => {
        const category = categories.find(c => c.id === tx.category_id);
        const payment = payments.find(p => p.id === tx.payment_method_id);
        return <tr key={tx.id}><td><div className="flex items-center gap-3"><ActivityIcon kind={activitySemantic(tx)} size={18}/><div><div className="max-w-[260px] truncate font-medium" title={tx.description}>{tx.description || t(tx.type)}</div><div className="mt-1 text-[11px] text-subtle">{t(tx.activity_kind&&tx.activity_kind!=='ordinary'?tx.activity_kind:tx.type)}</div></div></div></td><td><span className="category-badge"><span className="category-dot h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: categoryColor(tx.category_id,categories) }} /><span className="max-w-48 truncate" title={category?.name}>{category?.name ?? t('uncategorized')}</span></span></td>{!compact && <td><span className="block max-w-48 truncate text-subtle" title={payment?.name}>{payment?.name ?? t('noPayment')}</span></td>}{!compact && <td><span className="block max-w-48 truncate text-subtle" title={account(tx)}>{account(tx)}</span></td>}<td className="whitespace-nowrap text-subtle">{date(tx)}</td><td className={`whitespace-nowrap text-right font-semibold tabular-nums ${tx.type === 'income' ? 'transaction-income' : ''}`}>{amount(tx)}</td><td><TransactionActions transaction={tx} onEdit={onEdit} onDelete={onDelete} /></td></tr>;
      })}</tbody></table>
    </div>
  </>;
}

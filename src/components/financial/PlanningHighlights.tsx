import { CalendarClock, ChevronRight, CircleAlert } from 'lucide-react';
import { useCategories } from '@/hooks/useFinanceData';
import { usePlanningData } from '@/hooks/usePlanningData';
import { financialDate } from '@/domain/dates';
import { planningHighlights } from '@/domain/planning-highlights';
import { navigatePath } from '@/lib/routes';
import { useAppStore } from '@/store/useAppStore';
import { Failure, money, useFinancialCopy } from './shared';

export function PlanningHighlights() {
  const c = useFinancialCopy();
  const timezone = useAppStore(state => state.financialTimezone);
  const categories = useCategories();
  const { budgets, rules } = usePlanningData();
  const queries = [budgets, rules, categories];
  if (queries.some(query => query.isPending)) return <p role="status" className="text-xs text-subtle">{c('Loading planning highlights…', 'Memuatkan sorotan perancangan…')}</p>;
  const failure = queries.find(query => query.error);
  if (failure) return <Failure error={failure.error} retry={() => void Promise.all(queries.map(query => query.refetch()))} />;
  const today = financialDate(new Date(), timezone);
  const { alerts, next, unknown } = planningHighlights(budgets.data ?? [], rules.data ?? [], today);
  if (!alerts.length && !next && !unknown) return null;
  return <section className="card p-5 mt-5 space-y-4" aria-label={c('Planning highlights', 'Sorotan perancangan')}>
    <h3 className="font-semibold">{c('A useful next step', 'Langkah seterusnya yang berguna')}</h3>
    <p className="text-xs text-subtle">{c('Current-month budgets and the next planned recurring record. Review Plans for full detail.', 'Bajet bulan semasa dan rekod berulang seterusnya yang dirancang. Semak Pelan untuk butiran penuh.')}</p>
    <ul className="space-y-4">
      {alerts.slice(0, 1).map(budget => <li key={budget.id} className="planning-highlight"><div className="flex gap-2 items-center"><CircleAlert size={17} /><strong>{c('Budget reached', 'Bajet dicapai')}: {categories.data?.find(category => category.id === budget.category_id)?.name ?? c('Category', 'Kategori')}</strong></div><p className="text-xs mt-2">{money(budget.spent!, budget.currency)} / {money(budget.available!, budget.currency)} · {budget.month.slice(0, 7)}</p><button className="text-link mt-2" onClick={() => navigatePath('/plans?section=budgets')}>{c('Review budgets', 'Semak bajet')}<ChevronRight size={14} /></button></li>)}
      {next && <li className="planning-highlight"><div className="flex gap-2 items-center"><CalendarClock size={17} /><strong>{next.rule.description}</strong></div><p className="text-xs mt-2">{money(next.rule.amount, next.rule.currency)} · {next.date} · {timezone}</p><p className="text-xs text-subtle mt-2">{c('Planned record; requires your confirmation. No money has moved.', 'Rekod terancang; memerlukan pengesahan anda. Tiada wang dipindahkan.')}</p><button className="text-link mt-2" onClick={() => navigatePath('/plans?section=recurring')}>{c('Review recurring activity', 'Semak aktiviti berulang')}<ChevronRight size={14} /></button></li>}
    </ul>
    {unknown && <p role="status" className="text-xs text-subtle">{c('Some budget spending is unavailable. Review budgets before acting.', 'Sebahagian perbelanjaan bajet tidak tersedia. Semak bajet sebelum bertindak.')}</p>}
  </section>;
}

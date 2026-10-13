import { analyticsPeriod } from '@/domain/periods';
import type { Period } from '@/domain/periods';
import { financialDate } from '@/domain/dates';
import { dashboardFinancials } from '@/domain/dashboard';
import { useAnalyticsReport } from '@/hooks/useFinancialReports';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { Failure, useFinancialCopy } from '../financial/shared';
import { CashFlowChart } from './CashFlowChart';

/** A bounded six-month source query, independent of the overview metric period. */
export function OverviewTrend({ period }: { period: Period }) {
  const { t } = useTranslation();
  const c = useFinancialCopy();
  const { currency, locale, financialTimezone, exchangeRates } = useAppStore();
  const month = (period.to || financialDate(new Date(), financialTimezone)).slice(0, 7);
  const trendPeriod = { ...analyticsPeriod(month, 6), comparison: false, timezone: financialTimezone };
  const query = useAnalyticsReport(trendPeriod);
  if (query.isPending) return <section className="card p-6" role="status">{c('Loading six months of recorded cash flow…', 'Memuatkan aliran tunai direkodkan untuk enam bulan…')}</section>;
  if (query.error) return <Failure error={query.error} retry={() => void query.refetch()} />;
  const data = dashboardFinancials([], [], trendPeriod, currency, exchangeRates, financialTimezone, locale, t('uncategorized'), { monthly: query.data ?? [], net: [] });
  if (data.unavailable) return <section className="card p-6" role="status">{t('ratesUnavailable')}</section>;
  return <CashFlowChart points={data.chart} description={c('Six months of recorded income and spending. The latest month may be incomplete.', 'Enam bulan pendapatan dan perbelanjaan direkodkan. Bulan terkini mungkin belum lengkap.')} />;
}

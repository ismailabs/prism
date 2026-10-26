import {
  analyzePeriod,
  difference,
  periodIsPartial,
  ratio,
  type DisplayAmount,
} from "@/domain/analytics";
import { useAnalyticsReport } from "@/hooks/useFinancialReports";
import { drillTransactions } from "@/lib/navigation";
import { formatCurrency } from "@/services/currency";
import { useAppStore } from "@/store/useAppStore";
import type { Category } from "@/types";
import { useMemo } from "react";
import { periodMonths, type Period } from '@/domain/periods';
import { useTranslation } from "react-i18next";
import { Failure } from "../financial/shared";
import { FinancialOverview } from "../financial/Overview";
import { LoadingState } from "../LoadingState";
import { SpendingDonut } from "./SpendingDonut";
import { CashFlowChart, cashPoints } from "./CashFlowChart";
import { IntelligenceCenter } from './IntelligenceCenter';
import { MoneyText } from "../MoneyText";
export function Analytics({
  period,
  categories,
}: {
  period: Period;
  categories: Category[];
}) {
  const { t } = useTranslation();
  const {
    currency,
    locale,
    exchangeRates,
    financialTimezone,
    personalization,
  } = useAppStore();
  const report = useAnalyticsReport(period);
  const result = useMemo(() => {
    try {
      return {
        data: analyzePeriod(
          report.data ?? [],
          categories,
          period,
          currency,
          exchangeRates,
          t("uncategorized"),
        ),
        points: cashPoints(
          report.data ?? [],
          periodMonths(period, (report.data ?? []).map(r => r.financial_date ?? r.month + '-01')),
          currency,
          exchangeRates,
          locale,
          period,
        ),
        error: false,
      };
    } catch {
      return { error: true };
    }
  }, [
    report.data,
    categories,
    period,
    currency,
    exchangeRates,
    t,
    locale,
  ]);
  if (report.isPending) return <LoadingState />;
  if (report.error)
    return <Failure error={report.error} retry={() => void report.refetch()} />;
  const money = (value: DisplayAmount) =>
    `${result.data?.mixed ? "≈ " : ""}${formatCurrency(value, currency, locale)}`;
  const drill = (type?: string, category?: string | null) =>
    drillTransactions({
      type,
      category: category === null ? "uncategorized" : category,
      from: period.from,
      to: period.to,
      activity: "ordinary",
    });
  return (
    <div className="space-y-6">
      <p className="text-sm text-subtle">{t('analyticsDescription')}</p>
      <p className="text-xs text-subtle">
        {period.from ? `${period.from} — ${period.to}` : t('period_all-time')} · {period.timezone}
        {period.comparison !== false && <> · {t('previousPeriod')}: {period.previousFrom} — {period.previousTo}</>}
      </p>
      {periodIsPartial(period, financialTimezone) && (
        <p className="warning-message" role="status">
          {t("partialPeriod")}
        </p>
      )}
      {result.error ? (
        <p className="warning-message" role="status">
          {t("ratesUnavailable")}
        </p>
      ) : (
        result.data && (
          <>
            <section
              className="analytics-metrics"
              aria-label={t("analyticsSummary")}
            >
              {[
                {
                  label: "analyticsPeriodIncome",
                  value: result.data.income,
                  previous: result.data.previousIncome,
                  type: "income",
                },
                {
                  label: "analyticsPeriodExpenses",
                  value: result.data.expense,
                  previous: result.data.previousExpense,
                  type: "expense",
                },
                {
                  label: "netFlow",
                  value: result.data.net,
                  previous: result.data.previousNet,
                  type: undefined,
                },
              ].map((item) => {
                const delta = difference(item.value, item.previous, currency),
                  percent = ratio(delta, item.previous, currency);
                return (
                  <button
                    key={item.label}
                    className={"card analytics-metric " + (item.type ?? "")}
                    onClick={() => drill(item.type)}
                  >
                    <span>{t(item.label)}</span>
                    <strong>
                      <MoneyText fit text={money(item.value)} />
                    </strong>
                    {period.comparison !== false && <small>
                      {t("previousPeriod")}: {money(item.previous)}
                    </small>}
                    {period.comparison !== false && <small>
                      {result.data!.previousCount
                        ? `${t("change")}: ${money(delta)} · ${personalization.privacyMode ? "•••" : percent === null ? t("noBaseline") : `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`}`
                        : t("noComparison")}
                    </small>}
                  </button>
                );
              })}
              <div className="card analytics-metric">
                <span>{t("surplusRate")}</span>
                <strong>
                  {personalization.privacyMode
                    ? "•••"
                    : result.data.surplusRate === null
                      ? "—"
                      : `${result.data.surplusRate.toFixed(1)}%`}
                </strong>
                <small>{t("ofIncome")}</small>
                <small>
                  {period.comparison !== false && <>{t("previousPeriod")}: {" "}
                  {personalization.privacyMode
                    ? "•••"
                    : result.data.previousSurplusRate === null
                      ? "—"
                      : `${result.data.previousSurplusRate.toFixed(1)}%`}</>}
                </small>
              </div>
            </section>
            {!result.data.count && (
              <p className="warning-message">{t("analyticsEmpty")}</p>
            )}
            <p className="text-xs text-subtle">{t("ordinaryOnly")}</p>
            <CashFlowChart points={result.points ?? []} />
            <div className="analytics-breakdowns">
              <SpendingDonut
                key={`expense-${period.from}-${period.to}`}
                items={result.data.spending}
                total={result.data.expense}
                onDrill={(id) => drill("expense", id)}
              />
              <SpendingDonut
                key={`income-${period.from}-${period.to}`}
                title="incomeAnalysis"
                empty="noIncomeData"
                items={result.data.incomeCategories}
                total={result.data.income}
                onDrill={(id) => drill("income", id)}
              />
            </div>
            {result.data.mixed && <p className="text-xs text-subtle">≈ {t('conversionEstimate', { currency, date: exchangeRates ? new Date(exchangeRates.updatedAt).toISOString() : '—' })} · {exchangeRates?.source ?? '—'}</p>}
          </>
        )
      )}
      <IntelligenceCenter period={period} />
      <p className="text-xs text-subtle">
        {t("progressSeparate")} {t("noHistoricalBalances")}
      </p>
      <FinancialOverview />
    </div>
  );
}

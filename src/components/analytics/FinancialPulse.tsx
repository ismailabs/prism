import {
  analyzePeriod,
  difference,
  type Period,
  periodIsPartial,
} from "@/domain/analytics";
import { useAnalyticsReport } from "@/hooks/useFinancialReports";
import { useCategories } from "@/hooks/useFinanceData";
import { drillTransactions } from "@/lib/navigation";
import { formatCurrency } from "@/services/currency";
import { useAppStore } from "@/store/useAppStore";
import { Activity, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
export function FinancialPulse({
  period,
}: {
  period: Period;
}) {
  const { t } = useTranslation();
  const {
    currency,
    locale,
    exchangeRates,
    personalization,
    financialTimezone,
  } = useAppStore();
  const report = useAnalyticsReport(period),
    categories = useCategories();
  if (report.isPending || categories.isPending)
    return (
      <p className="text-subtle" role="status">
        {t("loading")}
      </p>
    );
  if (report.error || categories.error)
    return (
      <p className="warning-message" role="status">
        {t("errorTitle")}
      </p>
    );
  let data: ReturnType<typeof analyzePeriod>;
  try {
    data = analyzePeriod(
      report.data ?? [],
      categories.data ?? [],
      period,
      currency,
      exchangeRates,
      t("uncategorized"),
    );
  } catch {
    return null;
  }
  const insights: { label: string; run: () => void }[] = [];
  const top = data.spending[0];
  if (top && data.spending.length > 1)
    insights.push({
      label: t("pulseLargest", { category: top.name }),
      run: () =>
        drillTransactions({
          type: "expense",
          category: top.id ?? "uncategorized",
          from: period.from,
          to: period.to,
          activity: "ordinary",
        }),
    });
  if (period.comparison !== false && data.previousCount && data.count && !personalization.privacyMode) {
    const delta = difference(data.expense, data.previousExpense, currency);
    if (Number(delta) !== 0)
      insights.push({
        label: t("pulseExpenseChange", {
          amount: `${data.mixed ? "≈ " : ""}${formatCurrency(
            typeof delta === "string"
              ? delta.replace("-", "")
              : Math.abs(delta),
            currency,
            locale,
          )}`,
          direction: t(Number(delta) < 0 ? "lower" : "higher"),
        }),
        run: () => useAppStore.getState().setActiveTab("analytics"),
      });
  }
  if (data.uncategorized)
    insights.push({
      label: t("pulseUncategorized", { count: data.uncategorized }),
      run: () =>
        drillTransactions({
          category: "uncategorized",
          from: period.from,
          to: period.to,
          activity: "ordinary",
        }),
    });
  return (
    <section className="pulse-section" aria-label={t("financialPulse")}>
      <div className="flex items-center gap-2">
        <Activity size={17} />
        <h3>{t("financialPulse")}</h3>
      </div>
      <p className="text-xs text-subtle mt-1">{t("pulseDetail")}</p>
      {periodIsPartial(period, financialTimezone) && (
        <p className="text-xs text-subtle mt-2">{t("partialPeriod")}</p>
      )}
      {insights.length ? (
        <ul>
          {insights.slice(0, 3).map((item) => (
            <li key={item.label}>
              <button onClick={item.run}>
                {item.label}
                <ChevronRight size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-subtle">{t("noPulse")}</p>
      )}
    </section>
  );
}

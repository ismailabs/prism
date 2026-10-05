import { dashboardFinancials, type FinancialReport } from "@/domain/dashboard";
import { formatCurrency } from "@/services/currency";
import { useAppStore } from "@/store/useAppStore";
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Period } from '@/domain/periods';
export function AnalyticsBar({
  report,
  period,
  label,
}: {
  report?: FinancialReport;
  period: Period;
  label: string;
}) {
  const { t } = useTranslation();
  const s = useAppStore();
  if (!s.personalization.analyticsBar) return null;
  const data = report
    ? dashboardFinancials(
        [],
        [],
        period,
        s.currency,
        s.exchangeRates,
        s.financialTimezone,
        s.locale,
        t("uncategorized"),
        report,
      )
    : null;
  const money = (amount: string | number) =>
    !data || data.unavailable
      ? "—"
      : `${data.mixed ? "≈ " : ""}${formatCurrency(amount, s.currency, s.locale)}`;
  return (
    <aside className="analytics-bar" aria-label={t("analyticsBar")}>
      <button
        className="analytics-bar-period"
        onClick={() => s.setActiveTab("analytics")}
      >
        <ChartNoAxesCombined size={16} />
        <span>{label}</span>
      </button>
      <button onClick={() => s.setActiveTab("analytics")}>
        <ArrowDownLeft size={14} className="transaction-income" />
        <span>{t("income")}</span>
        <strong>{money(data?.incomeExact ?? "0")}</strong>
      </button>
      <button onClick={() => s.setActiveTab("analytics")}>
        <ArrowUpRight size={14} className="transaction-expense" />
        <span>{t("expenses")}</span>
        <strong>{money(data?.expenseExact ?? "0")}</strong>
      </button>
      <button onClick={() => s.setActiveTab("analytics")}>
        <span>{t("netFlow")}</span>
        <strong>
          {data && !data.positiveFlow ? "−" : ""}
          {money(data?.netMagnitude ?? "0")}
        </strong>
      </button>
      <button onClick={() => s.setActiveTab("analytics")}>
        <span>{t("savingsRate")}</span>
        <strong>
          {s.personalization.privacyMode
            ? "•••"
            : !data || data.unavailable || !data.income
              ? "—"
              : `${data.savingsRate.toFixed(1)}%`}
        </strong>
      </button>
    </aside>
  );
}

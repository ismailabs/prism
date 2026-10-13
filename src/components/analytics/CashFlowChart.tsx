import { totalAmount, type DisplayAmount, monthEnd } from "@/domain/analytics";
import { periodIncludes, type Period } from '@/domain/periods';
import { drillTransactions } from "@/lib/navigation";
import { formatCurrency } from "@/services/currency";
import { useAppStore } from "@/store/useAppStore";
import type { MonthlyTotal } from "@/types";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export interface CashPoint {
  key: string;
  name: string;
  income: number;
  expense: number;
  incomeExact: DisplayAmount;
  expenseExact: DisplayAmount;
  from?: string;
  to?: string;
}
export function cashPoints(
  rows: MonthlyTotal[],
  keys: string[],
  currency: ReturnType<typeof useAppStore.getState>["currency"],
  rates: ReturnType<typeof useAppStore.getState>["exchangeRates"],
  locale: string,
  period?: Period,
): CashPoint[] {
  return keys.map((key) => {
    const selected = rows.filter((r) => r.month === key && (!period || periodIncludes(r.financial_date ?? r.month + '-01', period)));
    const incomeExact = totalAmount(
        selected.filter((r) => r.type === "income"),
        currency,
        rates,
      ),
      expenseExact = totalAmount(
        selected.filter((r) => r.type === "expense"),
        currency,
        rates,
      );
    return {
      key,
      from: period?.from && period.from > key + '-01' ? period.from : key + '-01',
      to: period?.to && period.to < monthEnd(key) ? period.to : monthEnd(key),
      name: new Date(`${key}-01T12:00:00Z`).toLocaleDateString(
        locale === "ms" ? "ms-MY" : "en-US",
        { month: "short", year: "2-digit", timeZone: "UTC" },
      ),
      incomeExact,
      expenseExact,
      income: Number(incomeExact),
      expense: Number(expenseExact),
    };
  });
}
export function CashFlowChart({ points, description }: { points: CashPoint[]; description?: string }) {
  const { t } = useTranslation();
  const { currency, locale, personalization } = useAppStore();
  const reduced = useReducedMotion();
  const money = (value: DisplayAmount) =>
    formatCurrency(value, currency, locale);
  const drill = (point: CashPoint, type: "income" | "expense") =>
    drillTransactions({
      type,
      from: point.from ?? `${point.key}-01`,
      to: point.to && point.to < monthEnd(point.key) ? point.to : monthEnd(point.key),
      activity: "ordinary",
    });
  return (
    <section className="card overflow-hidden" aria-label={t("cashFlow")}>
      <div className="card-heading">
        <div>
          <h3>{t("cashFlow")}</h3>
          <p>{description ?? t("cashFlowDescription")}</p>
        </div>
        <div className="chart-legend">
          <span className="cash-flow-income">
            <i />
            {t("income")}
          </span>
          <span className="cash-flow-expense">
            <i />
            {t("expenses")}
          </span>
        </div>
      </div>
      <div className="h-[250px] px-3 pb-3" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            data={points}
            margin={{ right: 12, top: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--subtle)", fontSize: 11 }}
            />
            <YAxis
              width={48}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--subtle)", fontSize: 10 }}
              tickFormatter={(v) =>
                personalization.privacyMode
                  ? "•••"
                  : new Intl.NumberFormat(locale, {
                      notation: "compact",
                    }).format(Number(v))
              }
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{label}</strong>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)}>
                        {p.name}:{" "}
                        {money(
                          (p.payload as CashPoint)[
                            p.dataKey === "income"
                              ? "incomeExact"
                              : "expenseExact"
                          ],
                        )}
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            <Bar
              dataKey="income"
              name={t("income")}
              fill="var(--cash-income)"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
              isAnimationActive={personalization.chartAnimation && !reduced}
              animationDuration={350}
              onClick={(_, i) => {
                if (points[i]) drill(points[i], "income");
              }}
            />
            <Bar
              dataKey="expense"
              name={t("expenses")}
            fill="var(--data-spending)"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
              onClick={(_, i) => {
                if (points[i]) drill(points[i], "expense");
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>{t("details")}</summary>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>{t("month")}</th>
                <th>{t("income")}</th>
                <th>{t("expenses")}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key}>
                  <th>{p.name}</th>
                  {(["income", "expense"] as const).map((type) => (
                    <td key={type}>
                      <button
                        className="text-link"
                        aria-label={t("chartMonth", {
                          month: p.name,
                          type: t(type),
                        })}
                        onClick={() => drill(p, type)}
                      >
                        {money(
                          type === "income" ? p.incomeExact : p.expenseExact,
                        )}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

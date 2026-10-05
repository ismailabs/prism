import {
  groupCategories,
  type CategoryAmount,
  type DisplayAmount,
} from "@/domain/analytics";
import { formatCurrency } from "@/services/currency";
import { useAppStore } from "@/store/useAppStore";
import { ChevronRight, ReceiptText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { MoneyText } from "../MoneyText";

export function SpendingDonut({
  items,
  total,
  onDrill,
  title = "spending",
  empty = "noSpending",
}: {
  items: CategoryAmount[];
  total: DisplayAmount;
  onDrill: (id?: string | null) => void;
  title?: string;
  empty?: string;
}) {
  const { t } = useTranslation();
  const { currency, locale, personalization } = useAppStore();
  const [selected, setSelected] = useState<string | null | undefined>();
  const [all, setAll] = useState(false);
  const grouped = groupCategories(items, currency, t("other"));
  const segments = grouped;
  const legend = all ? items : grouped;
  const active = [...legend, ...grouped].find((item) => item.id === selected);
  const money = (value: DisplayAmount) =>
    formatCurrency(value, currency, locale);
  const percentage = (value: number) =>
    personalization.privacyMode ? "•••" : `${value.toFixed(1)}%`;

  return (
    <section className="card donut-card" aria-label={t(title)}>
      <div className="card-heading">
        <div>
          <h3>{t(title)}</h3>
          <p>
            {t(
              title === "spending"
                ? "spendingDescription"
                : "incomeDescription",
            )}
          </p>
        </div>
        <ReceiptText size={17} className="text-subtle" />
      </div>
      {!items.length ? (
        <div className="spending-empty">
          <div className="empty-icon">
            <ReceiptText size={22} />
          </div>
          <strong>{t(empty)}</strong>
          <p>
            {t(
              title === "spending"
                ? "noSpendingDescription"
                : "noIncomeDescription",
            )}
          </p>
          <Button variant="outline" onClick={() => onDrill()}>
            {t("transactions")}
            <ChevronRight size={14} />
          </Button>
        </div>
      ) : (
        <>
          <div
            className={
              "donut-layout " +
              (personalization.compactLegend ? "compact-legend" : "")
            }
          >
            <div className="donut-visual">
              <svg
                viewBox="0 0 220 220"
                className="donut-svg"
                role="group"
                aria-label={t(title)}
              >
                <circle
                  cx="110"
                  cy="110"
                  r="88"
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="27"
                />
                {segments.map((item, index) => {
                  const share =
                    Number(total) > 0 ? (item.value / Number(total)) * 100 : 0;
                  const start = segments
                    .slice(0, index)
                    .reduce(
                      (sum, s) =>
                        sum +
                        (Number(total) > 0
                          ? (s.value / Number(total)) * 100
                          : 0),
                      0,
                    );
                  return (
                    <circle
                      key={item.id ?? "none"}
                      cx="110"
                      cy="110"
                      r="88"
                      fill="none"
                      pathLength="100"
                      stroke={item.color}
                      strokeWidth={selected === item.id ? 34 : 27}
                      strokeDasharray={`${Math.max(0, share - 0.45)} ${100 - Math.max(0, share - 0.45)}`}
                      strokeDashoffset={-start}
                      transform="rotate(-90 110 110)"
                      className="donut-segment"
                      style={{
                        opacity:
                          selected === undefined || selected === item.id
                            ? 1
                            : 0.42,
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${index + 1}. ${item.name}: ${money(item.exact)}, ${percentage(item.percent)}`}
                      aria-pressed={selected === item.id}
                      onClick={() => {
                        setSelected(selected === item.id ? undefined : item.id);
                        if (item.ids) setAll(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(
                            selected === item.id ? undefined : item.id,
                          );
                          if (item.ids) setAll(true);
                        }
                      }}
                    >
                      <title>
                        {item.name}: {money(item.exact)}
                      </title>
                    </circle>
                  );
                })}
              </svg>
              <div className="donut-center">
                <span>
                  {active?.name ??
                    t(title === "spending" ? "totalSpending" : "income")}
                </span>
                <strong>
                  <MoneyText text={money(active?.exact ?? total)} />
                </strong>
                {active && <small>{percentage(active.percent)}</small>}
              </div>
            </div>
            <ul className="donut-legend" aria-label={t("category")}>
              {legend.map((item, index) => (
                <li key={item.id ?? "none"}>
                  <button
                    className={
                      "donut-legend-item " +
                      (selected === item.id ? "selected" : "")
                    }
                    aria-pressed={selected === item.id}
                    aria-label={t("selectCategory", { category: item.name })}
                    onClick={() => {
                      setSelected(selected === item.id ? undefined : item.id);
                      if (item.ids) setAll(true);
                    }}
                  >
                    <span
                      className="category-key"
                      style={{ borderColor: item.color }}
                    >
                      {index + 1}
                    </span>
                    <span className="legend-name">
                      {item.name}
                      <small>
                        {t("transactionsCount", { count: item.count })}
                      </small>
                    </span>
                    <span className="legend-value">
                      <strong>
                        <MoneyText text={money(item.exact)} />
                      </strong>
                      <small>{percentage(item.percent)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="donut-actions">
            {items.length > 6 && (
              <button
                className="text-link"
                onClick={() => {
                  setAll(!all);
                  setSelected(undefined);
                }}
              >
                {t(all ? "showTopCategories" : "showAllCategories")}
              </button>
            )}
            {active && !active.ids && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDrill(active.id)}
              >
                {t("viewCategoryTransactions", { category: active.name })}
                <ChevronRight size={14} />
              </Button>
            )}
          </div>
          <p className="chart-footer text-xs">{t("chartApproximate")}</p>
        </>
      )}
    </section>
  );
}

import { budgetBalances } from "@/domain/planning";
import { financialDate } from "@/domain/dates";
import { usePlanningData } from "@/hooks/usePlanningData";
import { useAppStore } from "@/store/useAppStore";
import { Failure, useFinancialCopy } from "./shared";

export function PlanningSummary() {
  const c = useFinancialCopy(),
    data = usePlanningData(),
    timezone = useAppStore((s) => s.financialTimezone),
    setTab = useAppStore((s) => s.setActiveTab);
  const month = financialDate(new Date(), timezone).slice(0, 7);
  if (data.budgets.error)
    return (
      <Failure
        error={data.budgets.error}
        retry={() => void data.budgets.refetch()}
      />
    );
  if (data.budgets.isPending)
    return (
      <p role="status">
        {c("Loading budget health…", "Memuatkan keadaan bajet…")}
      </p>
    );
  const rows = budgetBalances(data.budgets.data ?? []).filter((b) =>
    b.month.startsWith(month),
  );
  const alerts = rows.filter((b) => b.alert !== "healthy" && b.alert !== "unknown");
  return (
    <section
      className="border-t border-border pt-4 text-sm"
      aria-label={c("Budget health", "Keadaan bajet")}
    >
      <p>
        {c("Budget health", "Keadaan bajet")} · {month} · {timezone}:{" "}
        {rows.length
          ? `${rows.length} ${c("envelopes", "sampul")} · ${alerts.length} ${c("threshold notices", "notis ambang")}`
          : c(
              "No category budgets this month.",
              "Tiada bajet kategori bulan ini.",
            )}
      </p>
      {rows.some(b => b.alert === 'unknown') && <p role="status">{c('Some budget spending or rollover is unavailable.', 'Sebahagian perbelanjaan atau baki dibawa bajet tidak tersedia.')}</p>}
      <button className="text-link mt-2" onClick={() => setTab("plans")}>
        {c("Review planning assumptions", "Semak andaian perancangan")}
      </button>
    </section>
  );
}

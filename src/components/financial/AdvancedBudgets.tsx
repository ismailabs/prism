import { useState, type FormEvent } from "react";
import { budgetBalances, recurringForecast } from "@/domain/planning";
import { financialDate } from "@/domain/dates";
import { decimalMoney, parseMoney, parseMoneyTotal } from "@/domain/money";
import { usePlanningData } from "@/hooks/usePlanningData";
import { useAdvancedPlanning } from "@/hooks/useAdvancedPlanning";
import { useCategories } from "@/hooks/useFinanceData";
import { useAppStore } from "@/store/useAppStore";
import type { Currency } from "@/types";
import { errorMessage } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  currencies,
  Failure,
  money,
  positive,
  ProgressBar,
  useFinancialCopy,
} from "./shared";

export function AdvancedBudgets() {
  const c = useFinancialCopy(),
    data = usePlanningData(),
    advanced = useAdvancedPlanning('reserves'),
    cats = useCategories();
  const timezone = useAppStore((s) => s.financialTimezone),
    today = financialDate(new Date(), timezone);
  const [month, setMonth] = useState(today.slice(0, 7)),
    [currency, setCurrency] = useState<Currency>(
      useAppStore.getState().currency,
    );
  const [category, setCategory] = useState(""),
    [amount, setAmount] = useState(""),
    [rollover, setRollover] = useState(false),
    [threshold, setThreshold] = useState(80);
  const [reserveName, setReserveName] = useState(""),
    [reserveAmount, setReserveAmount] = useState(""),
    [error, setError] = useState("");
  const queries = [data.budgets, data.rules, cats, advanced.reserves];
  const failed = queries.find((q) => q.error);
  if (failed)
    return (
      <Failure
        error={failed.error}
        retry={() => void Promise.all(queries.map((q) => q.refetch()))}
      />
    );
  if (queries.some((q) => q.isPending))
    return (
      <p role="status">
        {c("Loading budget plans…", "Memuatkan pelan bajet…")}
      </p>
    );
  if (!/^\d{4}-\d{2}$/.test(month))
    return (
      <section className="card p-5">
        <label className="form-field">
          {c("Month", "Bulan")}
          <input
            className="input"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </section>
    );
  const balances = budgetBalances(data.budgets.data ?? []).filter(
    (b) => b.month.startsWith(month) && b.currency === currency,
  );
  const reserves = (advanced.reserves.data ?? []).filter(
    (r) => r.month.startsWith(month) && r.currency === currency,
  );
  const assigned =
    balances.reduce((n, b) => n + parseMoney(b.amount, currency), 0n) +
    reserves.reduce((n, r) => n + parseMoney(r.amount, currency), 0n);
  let forecast: ReturnType<typeof recurringForecast> | null = null,
    forecastError = "";
  try {
    forecast = recurringForecast(data.rules.data ?? [], month, today, currency);
  } catch (e) {
    forecastError = errorMessage(e);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (
        !positive(amount, currency) ||
        !category ||
        !Number.isInteger(threshold) ||
        threshold < 1 ||
        threshold > 100
      )
        throw new Error(
          c(
            "Enter a category, positive budget and threshold from 1 to 100.",
            "Masukkan kategori, bajet positif dan ambang 1 hingga 100.",
          ),
        );
      await data.budget.mutateAsync({
        month: `${month}-01`,
        category_id: category,
        currency,
        amount,
        rollover_enabled: rollover,
        alert_percent: threshold,
      });
      setAmount("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function saveReserve(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!reserveName.trim() || !positive(reserveAmount, currency))
        throw new Error(
          c(
            "Enter a reserve name and positive amount.",
            "Masukkan nama rizab dan amaun positif.",
          ),
        );
      await advanced.reserve.mutateAsync({
        month: `${month}-01`,
        currency,
        name: reserveName.trim(),
        amount: reserveAmount,
      });
      setReserveName("");
      setReserveAmount("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <section
      className="card p-5 space-y-5"
      aria-label={c("Budget planning", "Perancangan bajet")}
    >
      <h2 className="font-semibold">
        {c("Monthly category budgets", "Bajet kategori bulanan")}
      </h2>
      <p className="text-sm text-subtle">
        {c(
          "Posted ordinary expenses count. Transfers, savings earmarks and debt principal are excluded. Categories are separate envelopes.",
          "Perbelanjaan biasa direkodkan dikira. Pindahan, simpanan diperuntukkan dan prinsipal hutang dikecualikan. Kategori ialah sampul berasingan.",
        )}
      </p>
      <form
        onSubmit={(e) => void save(e)}
        className="grid sm:grid-cols-2 gap-3"
      >
        <label className="form-field">
          {c("Month", "Bulan")}
          <input
            className="input"
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label className="form-field">
          {c("Currency", "Mata wang")}
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            {currencies.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          {c("Expense category", "Kategori perbelanjaan")}
          <select
            className="input"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{c("Choose category", "Pilih kategori")}</option>
            {cats.data
              ?.filter((cat) => cat.type === "expense")
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>
        </label>
        <label className="form-field">
          {c("Budget amount", "Amaun bajet")}
          <input
            className="input"
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="form-field">
          {c("Alert threshold (%)", "Ambang amaran (%)")}
          <input
            className="input"
            type="number"
            min={1}
            max={100}
            required
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rollover}
            onChange={(e) => setRollover(e.target.checked)}
          />
          {c("Carry previous month remaining", "Bawa baki bulan sebelumnya")}
        </label>
        <p className="text-xs text-subtle sm:col-span-2">
          {c(
            "Rollover carries surplus or deficit from the immediately previous allocation. A missing month or disabled carry resets it. Editing history recalculates later months.",
            "Baki lebihan atau defisit dibawa daripada peruntukan bulan sebelumnya. Bulan tiada peruntukan atau pilihan dimatikan menetapkan semula baki. Suntingan sejarah mengira semula bulan seterusnya.",
          )}
        </p>
        <Button disabled={data.budget.isPending}>
          {c("Save budget", "Simpan bajet")}
        </Button>
      </form>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <p>
        {c("Assigned base allocations + reserves:", "Peruntukan asas + rizab:")}{" "}
        <strong>{money(decimalMoney(assigned, currency), currency)}</strong>
      </p>
      <p>
        {c("Reserved plans:", "Pelan rizab:")}{" "}
        {money(
          decimalMoney(
            reserves.reduce((n, r) => n + parseMoney(r.amount, currency), 0n),
            currency,
          ),
          currency,
        )}
      </p>
      <p className="text-xs text-subtle">
        {c(
          "This is a plan, not income or a cash balance. Rollover is excluded from assigned base totals.",
          "Ini ialah pelan, bukan pendapatan atau baki tunai. Baki dibawa dikecualikan daripada jumlah asas.",
        )}
      </p>
      {!balances.length && (
        <p>
          {c(
            "No budgets for this month and currency.",
            "Tiada bajet untuk bulan dan mata wang ini.",
          )}
        </p>
      )}
      <ul className="space-y-4">
        {balances.map((b) => {
          const available = b.available === null ? null : parseMoneyTotal(b.available, currency),
            spent = b.spent === undefined ? null : parseMoneyTotal(b.spent, currency);
          const futureSpending = (forecast?.occurrences ?? [])
            .filter(
              (o) =>
                !o.overdue &&
                o.rule.type === "expense" &&
                o.rule.category_id === b.category_id,
            )
            .reduce((n, o) => n + parseMoney(o.rule.amount, currency), 0n);
          return (
            <li key={b.id} className="space-y-2 border-t border-border pt-4">
              <strong>
                {cats.data?.find((cat) => cat.id === b.category_id)?.name ??
                  c("Category unavailable", "Kategori tidak tersedia")}
              </strong>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {[
                  [c("Planned", "Dirancang"), b.planned],
                  [c("Rollover", "Baki dibawa"), b.rollover],
                  [c("Available", "Tersedia"), b.available],
                  [
                    c(
                      "Posted eligible expense",
                      "Perbelanjaan layak direkodkan",
                    ),
                    b.spent ?? null,
                  ],
                  [c("Remaining", "Baki"), b.remaining],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-subtle">{label}</dt>
                    <dd>{value === null ? c('Unavailable', 'Tidak tersedia') : money(value, currency)}</dd>
                  </div>
                ))}
              </dl>
              {forecast && !forecastError && b.remaining !== null && (
                <p className="text-sm text-subtle">
                  {c(
                    "Forecast spending from rules:",
                    "Ramalan perbelanjaan daripada peraturan:",
                  )}{" "}
                  {money(decimalMoney(futureSpending, currency), currency)} ·{" "}
                  {c("Forecast remaining:", "Ramalan baki:")}{" "}
                  {money(
                    decimalMoney(
                      parseMoneyTotal(b.remaining, currency) - futureSpending,
                      currency,
                    ),
                    currency,
                  )}
                </p>
              )}
              {available !== null && spent !== null && <ProgressBar
                value={
                  available > 0n
                    ? Math.min(100, Number((spent * 10000n) / available) / 100)
                    : 100
                }
              />}
              {b.alert !== "healthy" && (
                <p role="status" className="warning-message">
                  {b.alert === 'unknown'
                    ? c('Spending or rollover is unavailable. Review before acting.', 'Perbelanjaan atau baki dibawa tidak tersedia. Semak sebelum bertindak.')
                    : b.alert === "over"
                    ? c("Over budget", "Melebihi bajet")
                    : c(
                        "Budget threshold reached",
                        "Ambang bajet dicapai",
                      )}{" "}
                  {b.alert !== 'unknown' && <>({b.alert_percent ?? 80}%)</>}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCategory(b.category_id);
                    setAmount(b.amount);
                    setRollover(b.rollover_enabled ?? false);
                    setThreshold(b.alert_percent ?? 80);
                  }}
                >
                  {c("Edit budget", "Sunting bajet")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.removeBudget.isPending}
                  onClick={() =>
                    void data.removeBudget
                      .mutateAsync(b.id)
                      .catch((e) => setError(errorMessage(e)))
                  }
                >
                  {c("Remove budget", "Buang bajet")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <h3 className="font-semibold">
        {c("Cash reserve plans", "Pelan rizab tunai")}
      </h3>
      <p className="text-sm text-subtle">
        {c(
          "Earmarks only. Saving this plan does not move cash or record an expense.",
          "Peruntukan sahaja. Menyimpan pelan ini tidak memindahkan tunai atau merekod perbelanjaan.",
        )}
      </p>
      <form
        onSubmit={(e) => void saveReserve(e)}
        className="grid sm:grid-cols-2 gap-3"
      >
        <label className="form-field">
          {c("Reserve name", "Nama rizab")}
          <input
            className="input"
            required
            maxLength={100}
            value={reserveName}
            onChange={(e) => setReserveName(e.target.value)}
          />
        </label>
        <label className="form-field">
          {c("Reserve amount", "Amaun rizab")}
          <input
            className="input"
            required
            inputMode="decimal"
            value={reserveAmount}
            onChange={(e) => setReserveAmount(e.target.value)}
          />
        </label>
        <Button disabled={advanced.reserve.isPending}>
          {c("Save reserve plan", "Simpan pelan rizab")}
        </Button>
      </form>
      <ul>
        {reserves.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
            <span>
              {r.name}: {money(r.amount, currency)}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={advanced.removeReserve.isPending}
              onClick={() =>
                void advanced.removeReserve
                  .mutateAsync(r.id)
                  .catch((e) => setError(errorMessage(e)))
              }
            >
              {c("Remove reserve", "Buang rizab")}
            </Button>
          </li>
        ))}
      </ul>
      <h3 className="font-semibold">
        {c(
          "Recurring forecast · unposted",
          "Ramalan berulang · belum direkodkan",
        )}
      </h3>
      <p className="text-xs text-subtle">
        {month} · {currency} · {timezone} · {c("As of", "Setakat")} {today}
      </p>
      {forecastError ? (
        <p role="alert">{forecastError}</p>
      ) : forecast?.ruleCount ? (
        <>
          <p>
            {c("Future rule income:", "Pendapatan peraturan akan datang:")}{" "}
            {money(forecast.income, currency)} ·{" "}
            {c("Future rule spending:", "Perbelanjaan peraturan akan datang:")}{" "}
            {money(forecast.spending, currency)}
          </p>
          <p>
            {c(
              "Overdue unrecorded spending:",
              "Perbelanjaan tertunggak belum direkodkan:",
            )}{" "}
            {money(forecast.overdueSpending, currency)}
          </p>
          <p className="text-xs text-subtle">
            {forecast.ruleCount}{" "}
            {c(
              "active rule assumptions. This covers only the listed rules, without an extrapolated spending rate. Past activity and future rules stay separate.",
              "andaian peraturan aktif. Ini hanya meliputi peraturan disenaraikan, tanpa kadar perbelanjaan diunjurkan. Aktiviti lalu dan peraturan akan datang kekal berasingan.",
            )}
          </p>
          <ul className="text-sm space-y-2">
            {forecast.occurrences.map((o) => (
              <li key={`${o.rule.id}/${o.date}`}>
                {o.date} · {o.rule.description} ·{" "}
                {money(o.rule.amount, currency)} ·{" "}
                {o.overdue
                  ? c("Due, unrecorded", "Tiba masa, belum direkodkan")
                  : c("Forecast", "Ramalan")}{" "}
                ·{" "}
                {o.rule.category_id
                  ? cats.data?.find((cat) => cat.id === o.rule.category_id)
                      ?.name
                  : c("Unallocated category", "Kategori tidak diperuntukkan")}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>
          {c(
            "Not enough data: no active recurring assumptions for this period and currency.",
            "Data tidak mencukupi: tiada andaian berulang aktif untuk tempoh dan mata wang ini.",
          )}
        </p>
      )}
    </section>
  );
}

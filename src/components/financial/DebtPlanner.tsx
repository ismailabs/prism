import { useState, type FormEvent } from "react";
import {
  debtScenario,
  debtTypes,
  parseApr,
  repaymentPreview,
  type DebtPlan,
  type DebtType,
  type PaymentFrequency,
} from "@/domain/planning";
import { financialDate } from "@/domain/dates";
import { useAdvancedPlanning } from "@/hooks/useAdvancedPlanning";
import { useAppStore } from "@/store/useAppStore";
import type { Currency, PersonDebt } from "@/types";
import { errorMessage } from "@/lib/utils";
import { Button } from "../ui/button";
import { planningMessage } from "./planningCopy";
import {
  currencies,
  Failure,
  money,
  positive,
  useFinancialCopy,
} from "./shared";

export function DebtPlanner({ debts }: { debts: PersonDebt[] }) {
  const c = useFinancialCopy(),
    data = useAdvancedPlanning("contracts"),
    timezone = useAppStore((s) => s.financialTimezone),
    today = financialDate(new Date(), timezone);
  const [debtId, setDebtId] = useState(""),
    [type, setType] = useState<DebtType>("custom"),
    [principal, setPrincipal] = useState(""),
    [asOf, setAsOf] = useState(today);
  const [apr, setApr] = useState(""),
    [rateMode, setRateMode] = useState<DebtPlan["rate_mode"]>("fixed"),
    [minimum, setMinimum] = useState(""),
    [frequency, setFrequency] = useState<PaymentFrequency>("monthly"),
    [first, setFirst] = useState(today),
    [rank, setRank] = useState(0);
  const [currency, setCurrency] = useState<Currency>(
      useAppStore.getState().currency,
    ),
    [strategy, setStrategy] = useState<"snowball" | "avalanche" | "custom">(
      "snowball",
    ),
    [budget, setBudget] = useState(""),
    [error, setError] = useState("");
  const [cash, setCash] = useState(""),
    [paidPrincipal, setPaidPrincipal] = useState(""),
    [interest, setInterest] = useState("0"),
    [fees, setFees] = useState("0"),
    [preview, setPreview] = useState<ReturnType<
      typeof repaymentPreview
    > | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (data.contracts.error)
    return (
      <Failure
        error={data.contracts.error}
        retry={() => void data.contracts.refetch()}
      />
    );
  if (data.contracts.isPending)
    return (
      <p role="status">{c("Loading debt plans…", "Memuatkan pelan hutang…")}</p>
    );
  const debt = debts.find((d) => d.id === debtId),
    contracts = data.contracts.data ?? [];
  const selectedPlans = contracts
    .filter((p) => p.currency === currency)
    .map((p) => ({
      ...p,
      direction:
        debts.find((d) => d.id === p.debt_id)?.direction ?? "owed_to_me",
      name: debts.find((d) => d.id === p.debt_id)?.counterparty ?? "",
    }));
  let scenario: ReturnType<typeof debtScenario> | null = null,
    scenarioError = "";
  if (budget)
    try {
      scenario = debtScenario(selectedPlans, currency, budget, strategy);
    } catch (e) {
      scenarioError = errorMessage(e);
    }
  function select(id: string) {
    setDebtId(id);
    setPreview(null);
    setError("");
    const p = contracts.find((p) => p.debt_id === id);
    setType(p?.debt_type ?? "custom");
    setPrincipal(p?.scenario_principal ?? "");
    setAsOf(p?.balance_as_of ?? today);
    setApr(
      p?.apr_bps === null || p?.apr_bps === undefined
        ? ""
        : `${Math.floor(p.apr_bps / 100)}.${String(p.apr_bps % 100).padStart(2, "0")}`,
    );
    setRateMode(p?.rate_mode ?? "fixed");
    setMinimum(p?.minimum_payment ?? "");
    setFrequency(p?.frequency ?? "monthly");
    setFirst(p?.first_payment_date ?? today);
    setRank(p?.custom_rank ?? 0);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPreview(null);
    try {
      if (
        !debt ||
        !positive(principal, debt.currency) ||
        (minimum && !positive(minimum, debt.currency))
      )
        throw new Error(
          c(
            "Enter an explicit positive principal snapshot and valid minimum.",
            "Masukkan gambaran prinsipal positif dan minimum sah.",
          ),
        );
      await data.contract.mutateAsync({
        debt_id: debt.id,
        currency: debt.currency,
        debt_type: type,
        scenario_principal: principal,
        balance_as_of: asOf,
        apr_bps: parseApr(apr),
        rate_mode: rateMode,
        minimum_payment: minimum || null,
        frequency,
        first_payment_date: first,
        custom_rank: rank,
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  function split(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPreview(null);
    try {
      if (!debt) throw new Error(c("Choose a debt.", "Pilih hutang."));
      setPreview(
        repaymentPreview({
          currency: debt.currency,
          debtCurrency: debt.currency,
          accountCurrency: debt.currency,
          direction: debt.direction,
          outstanding: principal,
          principal: paidPrincipal,
          interest,
          fees,
          cash,
        }),
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <section
      className="card p-5 space-y-5"
      aria-label={c("Debt planning scenarios", "Senario perancangan hutang")}
    >
      <h2 className="font-semibold">
        {c("Debt contracts & scenarios", "Kontrak & senario hutang")}
      </h2>
      <p className="text-sm text-subtle">
        {c(
          "Planning only. Contract balances are your dated assumptions, separate from legacy repayment totals. Schedules never post money.",
          "Perancangan sahaja. Baki kontrak ialah andaian bertarikh anda, berasingan daripada jumlah bayaran balik lama. Jadual tidak merekodkan wang.",
        )}
      </p>
      {!debts.length ? (
        <p>
          {c(
            "Create a debt record to add a planning contract.",
            "Cipta rekod hutang untuk menambah kontrak perancangan.",
          )}
        </p>
      ) : (
        <form
          onSubmit={(e) => void save(e)}
          className="grid sm:grid-cols-2 gap-3"
        >
          <label className="form-field">
            {c("Planning debt", "Hutang perancangan")}
            <select
              className="input"
              required
              value={debtId}
              onChange={(e) => select(e.target.value)}
            >
              <option value="">{c("Choose debt", "Pilih hutang")}</option>
              {debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.counterparty} · {d.currency} ·{" "}
                  {d.direction === "i_owe"
                    ? c("Liability", "Liabiliti")
                    : c("Receivable", "Belum terima")}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            {c("Debt type", "Jenis hutang")}
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as DebtType)}
            >
              {debtTypes.map((v, i) => (
                <option key={v} value={v}>
                  {c(
                    [
                      "Credit card",
                      "Personal loan",
                      "Car loan",
                      "Student loan",
                      "Mortgage",
                      "BNPL",
                      "Family / friend",
                      "Custom",
                    ][i],
                    [
                      "Kad kredit",
                      "Pinjaman peribadi",
                      "Pinjaman kereta",
                      "Pinjaman pelajar",
                      "Gadai janji",
                      "BNPL",
                      "Keluarga / rakan",
                      "Tersuai",
                    ][i],
                  )}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            {c("Assumed outstanding principal", "Andaian prinsipal tertunggak")}{" "}
            ({debt?.currency ?? "—"})
            <input
              className="input"
              required
              inputMode="decimal"
              value={principal}
              onChange={(e) => {
                setPrincipal(e.target.value);
                setPreview(null);
              }}
            />
          </label>
          <label className="form-field">
            {c("Balance snapshot date", "Tarikh gambaran baki")}
            <input
              className="input"
              required
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </label>
          <label className="form-field">
            {c("Interest mode", "Mod faedah")}
            <select
              className="input"
              value={rateMode}
              onChange={(e) =>
                setRateMode(e.target.value as DebtPlan["rate_mode"])
              }
            >
              <option value="fixed">{c("Fixed APR", "APR tetap")}</option>
              <option value="variable">
                {c("Variable · no forecast", "Berubah · tiada ramalan")}
              </option>
              <option value="manual">
                {c("Manual · no forecast", "Manual · tiada ramalan")}
              </option>
            </select>
          </label>
          <label className="form-field">
            {c("APR (%) · optional", "APR (%) · pilihan")}
            <input
              className="input"
              inputMode="decimal"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
            />
          </label>
          <label className="form-field">
            {c("Minimum payment · optional", "Bayaran minimum · pilihan")}
            <input
              className="input"
              inputMode="decimal"
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
            />
          </label>
          <label className="form-field">
            {c("Payment frequency", "Kekerapan bayaran")}
            <select
              className="input"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}
            >
              <option value="monthly">{c("Monthly", "Bulanan")}</option>
              <option value="biweekly">
                {c("Every two weeks", "Setiap dua minggu")}
              </option>
              <option value="weekly">{c("Weekly", "Mingguan")}</option>
            </select>
          </label>
          <label className="form-field">
            {c("First planned payment", "Bayaran pertama dirancang")}
            <input
              className="input"
              required
              type="date"
              min={asOf}
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            />
          </label>
          <label className="form-field">
            {c(
              "Custom priority (lower first)",
              "Keutamaan tersuai (rendah dahulu)",
            )}
            <input
              className="input"
              type="number"
              required
              min={0}
              max={100000}
              value={rank}
              onChange={(e) => setRank(Number(e.target.value))}
            />
          </label>
          <Button disabled={data.contract.isPending}>
            {c("Save planning contract", "Simpan kontrak perancangan")}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="error-message">
          {planningMessage(error, c)}
        </p>
      )}
      {contracts.length > 0 && (
        <ul
          className="space-y-3"
          aria-label={c("Contract assumptions", "Andaian kontrak")}
        >
          {contracts.map((p) => (
            <li key={p.id} className="border-t border-border pt-3 text-sm">
              <strong>
                {debts.find((d) => d.id === p.debt_id)?.counterparty ?? "—"}
              </strong>{" "}
              · {money(p.scenario_principal, p.currency)} ·{" "}
              {c("Snapshot", "Gambaran")} {p.balance_as_of}
              <p>
                {c("First planned payment", "Bayaran pertama dirancang")}:{" "}
                {p.first_payment_date} · {timezone} · {p.frequency}
              </p>
              {p.first_payment_date <= today ? (
                <p role="status" className="warning-message">
                  {c(
                    "Review this due planning assumption against actual recorded payments.",
                    "Semak andaian perancangan tiba masa ini berbanding bayaran direkodkan sebenar.",
                  )}
                </p>
              ) : (
                Date.parse(`${p.first_payment_date}T00:00:00Z`) -
                  Date.parse(`${today}T00:00:00Z`) <=
                  7 * 86400000 && (
                  <p role="status">
                    {c(
                      "Upcoming planned payment within 7 days.",
                      "Bayaran dirancang akan datang dalam 7 hari.",
                    )}
                  </p>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      <h3 className="font-semibold">
        {c("Payoff comparison · forecast", "Perbandingan pelunasan · ramalan")}
      </h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="form-field">
          {c("Scenario currency", "Mata wang senario")}
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
          {c("Payoff strategy", "Strategi pelunasan")}
          <select
            className="input"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as typeof strategy)}
          >
            <option value="snowball">
              {c("Snowball · smallest balance", "Bola salji · baki terkecil")}
            </option>
            <option value="avalanche">
              {c("Avalanche · highest APR", "Runtuhan · APR tertinggi")}
            </option>
            <option value="custom">
              {c("Custom priority", "Keutamaan tersuai")}
            </option>
          </select>
        </label>
        <label className="form-field">
          {c("Payment budget per period", "Bajet bayaran setiap tempoh")}
          <input
            className="input"
            inputMode="decimal"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
      </div>
      <p className="text-xs text-subtle">
        {c(
          "Liabilities only, in the selected native currency. Receivables and other currencies are excluded. Combined contracts require matching snapshot dates, first dates and frequency.",
          "Liabiliti sahaja, dalam mata wang dipilih. Belum terima dan mata wang lain dikecualikan. Kontrak gabungan memerlukan tarikh gambaran, tarikh pertama dan kekerapan sepadan.",
        )}
      </p>
      <p className="text-xs text-subtle">
        {c(
          "Fixed nominal APR / 12, 26 or 52 on each opening balance; interest rounded half up to minor units. No daily accrual, changing rates, new borrowing or automatic payments. Early payments require a new snapshot; actual partial payments belong in the ledger.",
          "APR nominal tetap / 12, 26 atau 52 pada baki awal; faedah dibundarkan ke unit kecil. Tiada akruan harian, kadar berubah, pinjaman baharu atau bayaran automatik. Bayaran awal memerlukan gambaran baharu; bayaran separa sebenar direkod dalam lejar.",
        )}
      </p>
      <p className="text-xs text-subtle">
        {c(
          "Each row assumes a full payment period, including the first row. The model stops after 600 periods; interest shown covers only the modeled schedule.",
          "Setiap baris mengandaikan tempoh bayaran penuh, termasuk baris pertama. Model berhenti selepas 600 tempoh; faedah dipaparkan hanya meliputi jadual dimodelkan.",
        )}
      </p>
      {scenarioError ? (
        <p role="alert">{planningMessage(scenarioError, c)}</p>
      ) : !scenario ? (
        <p>
          {c(
            "Not enough data: enter a payment budget and save contract assumptions.",
            "Data tidak mencukupi: masukkan bajet bayaran dan simpan andaian kontrak.",
          )}
        </p>
      ) : (
        <>
          <p role="status">
            {scenario.status === "paid_off"
              ? c("Illustrative payoff date:", "Tarikh pelunasan ilustrasi:") +
                " " +
                scenario.payoffDate
              : scenario.status === "negative_amortization"
                ? c(
                    "Negative amortization: payment does not reduce principal.",
                    "Pelunasan negatif: bayaran tidak mengurangkan prinsipal.",
                  )
                : scenario.status === "horizon"
                  ? c(
                      "Outstanding beyond the scenario horizon.",
                      "Tertunggak melebihi tempoh senario.",
                    )
                  : c("Not enough data:", "Data tidak mencukupi:") +
                    " " +
                    planningMessage(scenario.reason, c)}
          </p>
          {scenario.rows.length > 0 && (
            <>
              <p>
                {c("Illustrative interest:", "Faedah ilustrasi:")}{" "}
                {money(scenario.totalInterest, currency)}
              </p>
              <div
                className="overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label={c(
                  "Scrollable payment schedule",
                  "Jadual bayaran boleh ditatal",
                )}
              >
                <table className="w-full min-w-[640px] whitespace-nowrap text-sm">
                  <caption className="text-left">
                    {c(
                      "Unposted payment schedule",
                      "Jadual bayaran belum direkodkan",
                    )}
                  </caption>
                  <thead>
                    <tr>
                      {[
                        c("Date", "Tarikh"),
                        c("Debt", "Hutang"),
                        c("Principal", "Prinsipal"),
                        c("Interest", "Faedah"),
                        c("Payment", "Bayaran"),
                        c("Remaining", "Baki"),
                      ].map((v) => (
                        <th key={v} className="p-2 text-left">
                          {v}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(showAll ? scenario.rows : scenario.rows.slice(0, 12)).map(
                      (r, i) => (
                        <tr key={`${r.debt_id}/${i}`}>
                          {[
                            r.date,
                            debts.find((d) => d.id === r.debt_id)
                              ?.counterparty ?? "—",
                            money(r.principal, currency),
                            money(r.interest, currency),
                            money(r.payment, currency),
                            money(r.remaining, currency),
                          ].map((v, j) => (
                            <td key={j} className="p-2">
                              {v}
                            </td>
                          ))}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              {scenario.rows.length > 12 && (
                <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                  {showAll
                    ? c("Show first 12 payments", "Papar 12 bayaran pertama")
                    : c("Show full schedule", "Papar jadual penuh")}
                </Button>
              )}
            </>
          )}
        </>
      )}
      {debt && (
        <>
          <h3 className="font-semibold">
            {c(
              "Actual repayment split · preview only",
              "Pecahan bayaran sebenar · pratonton sahaja",
            )}
          </h3>
          <form onSubmit={split} className="grid sm:grid-cols-2 gap-3">
            {[
              [c("Full cash amount", "Amaun tunai penuh"), cash, setCash],
              [
                c("Actual principal", "Prinsipal sebenar"),
                paidPrincipal,
                setPaidPrincipal,
              ],
              [c("Actual interest", "Faedah sebenar"), interest, setInterest],
              [c("Actual fees", "Fi sebenar"), fees, setFees],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="form-field">
                {label as string}
                <input
                  className="input"
                  required
                  inputMode="decimal"
                  value={value as string}
                  onChange={(e) => {
                    (setter as (v: string) => void)(e.target.value);
                    setPreview(null);
                  }}
                />
              </label>
            ))}
            <Button>{c("Preview split", "Pratonton pecahan")}</Button>
          </form>
          {preview && (
            <div role="status">
              <p>
                {c("Cash effect", "Kesan tunai")}:{" "}
                {money(preview.cashEffect, debt.currency)}
              </p>
              <p>
                {c("Liability reduction", "Pengurangan liabiliti")}:{" "}
                {money(preview.liabilityReduction, debt.currency)} ·{" "}
                {c("Receivable reduction", "Pengurangan belum terima")}:{" "}
                {money(preview.receivableReduction, debt.currency)}
              </p>
              <p>
                {c("Expense", "Perbelanjaan")}:{" "}
                {money(preview.expense, debt.currency)} ·{" "}
                {c("Income", "Pendapatan")}:{" "}
                {money(preview.income, debt.currency)}
              </p>
            </div>
          )}
          <p className="text-sm text-subtle">
            {c(
              "No repayment is posted here. Verified ledger integration and audited corrections are required first. Card principal settlement does not create another purchase expense.",
              "Tiada bayaran direkodkan di sini. Integrasi lejar disahkan dan pembetulan diaudit diperlukan dahulu. Pelunasan prinsipal kad tidak mewujudkan perbelanjaan pembelian kedua.",
            )}
          </p>
        </>
      )}
    </section>
  );
}

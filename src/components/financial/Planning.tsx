import { financialDate } from "@/domain/dates";
import { parseMoney,parseMoneyTotal } from "@/domain/money";
import { occurrenceDate, type Frequency } from "@/domain/recurrence";
import { useCategories } from "@/hooks/useFinanceData";
import { usePlanningData } from "@/hooks/usePlanningData";
import { usePlatformTable } from "@/hooks/usePlatformData";
import { errorMessage } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Currency } from "@/types";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
import { ObjectivesPage } from "./Objectives";
import {
  currencies,
  Failure,
  money,
  positive,
  ProgressBar,
  useFinancialCopy,
} from "./shared";
export function Plans() {
  const c = useFinancialCopy();
  const [tab, setTab] = useState<"goal" | "savings" | "budgets" | "recurring">(
    "goal",
  );
  return (
    <div className="space-y-5">
      <nav
        className="plan-tabs"
        aria-label={c("Plans", "Perancangan")}
      >
        {(["goal", "savings", "budgets", "recurring"] as const).map((v, i) => (
          <Button
            key={v}
            variant={tab === v ? "default" : "outline"}
            aria-pressed={tab === v}
            onClick={() => setTab(v)}
          >
            {c(
              ["Goals", "Savings", "Budgets", "Recurring activity"][i],
              ["Matlamat", "Simpanan", "Bajet", "Aktiviti berulang"][i],
            )}
          </Button>
        ))}
      </nav>
      {tab === "goal" || tab === "savings" ? (
        <ObjectivesPage key={tab} kind={tab} />
      ) : tab === "budgets" ? (
        <Budgets />
      ) : (
        <Recurring />
      )}
    </div>
  );
}
function Budgets() {
  const c = useFinancialCopy();
  const data = usePlanningData();
  const cats = useCategories();
  const [month, setMonth] = useState(() =>
    financialDate(new Date(), useAppStore.getState().financialTimezone).slice(
      0,
      7,
    ),
  );
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(
    useAppStore.getState().currency,
  );
  const [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (!positive(amount, currency))
        throw new Error(
          c("Enter a positive budget.", "Masukkan bajet positif."),
        );
      await data.budget.mutateAsync({
        month: `${month}-01`,
        category_id: category,
        currency,
        amount,
      });
      setAmount("");
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  if (data.budgets.error || cats.error)
    return (
      <Failure
        error={data.budgets.error ?? cats.error}
        retry={() => void Promise.all([data.budgets.refetch(), cats.refetch()])}
      />
    );
  return (
    <section className="card p-5 space-y-5">
      <h2 className="font-semibold">
        {c("Monthly category budgets", "Bajet kategori bulanan")}
      </h2>
      <p className="text-sm text-subtle">
        {c(
          "Only genuine expenses count. Transfers, allocations and debt principal are excluded.",
          "Hanya perbelanjaan sebenar dikira. Pindahan, peruntukan dan prinsipal hutang dikecualikan.",
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
          {c("Budget amount", "Amaun bajet")}
          <input
            className="input"
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <Button disabled={data.budget.isPending}>
          {c("Save budget", "Simpan bajet")}
        </Button>
      </form>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <ul className="space-y-4">
        {data.budgets.data
          ?.filter((b) => b.month.startsWith(month))
          .map((b) => {
            const spent = parseMoneyTotal(b.spent ?? "0", b.currency),
              limit = parseMoney(b.amount, b.currency);
            return (
              <li key={b.id} className="space-y-2">
                <strong>
                  {cats.data?.find((cat) => cat.id === b.category_id)?.name}
                </strong>
                <p>
                  {money(b.spent ?? "0", b.currency)} /{" "}
                  {money(b.amount, b.currency)}
                </p>
                <ProgressBar
                  value={Math.min(100, Number((spent * 10000n) / limit) / 100)}
                />
                {spent > limit && (
                  <p className="warning-message">
                    {c("Over budget", "Melebihi bajet")}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={data.removeBudget.isPending}
                  onClick={() =>
                    void data.removeBudget
                      .mutateAsync(b.id)
                      .catch((e) => toast.error(errorMessage(e)))
                  }
                >
                  {c("Remove budget", "Buang bajet")}
                </Button>
              </li>
            );
          })}
      </ul>
    </section>
  );
}
function Recurring() {
  const c = useFinancialCopy();
  const timezone = useAppStore((s) => s.financialTimezone);
  const data = usePlanningData();
  const accounts = usePlatformTable("accounts");
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(
    useAppStore.getState().currency,
  );
  const [type, setType] = useState<"income" | "expense">("expense");
  const [start, setStart] = useState(() => financialDate(new Date(), timezone));
  const [end, setEnd] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [interval, setInterval] = useState(1);
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!positive(amount, currency))
        throw new Error(
          c("Enter a positive amount.", "Masukkan amaun positif."),
        );
      occurrenceDate({ start, end, frequency, interval }, 0);
      await data.rule.mutateAsync({
        description,
        amount,
        currency,
        type,
        account_id: account || null,
        category_id: null,
        payment_method_id: null,
        start_date: start,
        end_date: end || null,
        frequency,
        interval,
        next_index: 0,
        active: true,
      });
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  if (data.rules.error)
    return (
      <Failure
        error={data.rules.error}
        retry={() => void data.rules.refetch()}
      />
    );
  return (
    <section className="card p-5 space-y-4">
      <div className="flex justify-between gap-3">
        <h2 className="font-semibold">
          {c("Recurring activity", "Aktiviti berulang")}
        </h2>
        <Button onClick={() => setOpen(true)}>
          {c("New recurring rule", "Peraturan berulang baharu")}
        </Button>
      </div>
      <p className="text-sm text-subtle">
        {c(
          "Review and record each due occurrence. Nothing is created automatically. Repeating a request cannot duplicate a recorded occurrence.",
          "Semak dan rekod setiap kejadian yang tiba masanya. Tiada transaksi dibuat secara automatik. Permintaan berulang tidak menduplikasi kejadian yang direkodkan.",
        )}
      </p>
      <ul className="divide-y divide-border">
        {data.rules.data?.map((rule) => {
          const due = occurrenceDate(
            {
              start: rule.start_date,
              end: rule.end_date,
              frequency: rule.frequency,
              interval: rule.interval,
            },
            rule.next_index,
          );
          return (
            <li key={rule.id} className="py-4 space-y-2">
              <strong>{rule.description}</strong>
              <p>
                {money(rule.amount, rule.currency)} ·{" "}
                {due ?? c("Finished", "Selesai")} · {timezone}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={
                    !rule.active ||
                    !due ||
                    due > financialDate(new Date(), timezone) ||
                    data.record.isPending
                  }
                  onClick={() => {
                    if (due)
                      void data.record
                        .mutateAsync({
                          rule: rule.id,
                          index: rule.next_index,
                          date: due,
                        })
                        .catch((e) => toast.error(errorMessage(e)));
                  }}
                >
                  {c("Record due occurrence", "Rekod kejadian tiba masa")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void data.toggleRule
                      .mutateAsync({ id: rule.id, active: !rule.active })
                      .catch((e) => toast.error(errorMessage(e)))
                  }
                >
                  {rule.active ? c("Pause", "Jeda") : c("Resume", "Sambung")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={c("New recurring rule", "Peraturan berulang baharu")}
      >
        <form className="space-y-4" onSubmit={(e) => void save(e)}>
          <label className="form-field">
            {c("Description", "Penerangan")}
            <input
              className="input"
              required
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="form-field">
            {c("Type", "Jenis")}
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as "income" | "expense")}
            >
              <option value="expense">{c("Expense", "Perbelanjaan")}</option>
              <option value="income">{c("Income", "Pendapatan")}</option>
            </select>
          </label>
          <label className="form-field">
            {c("Amount", "Amaun")}
            <input
              className="input"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="form-field">
            {c("Currency", "Mata wang")}
            <select
              className="input"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value as Currency);
                setAccount("");
              }}
            >
              {currencies.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            {c("Account", "Akaun")}
            <select
              className="input"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">{c("Unassigned", "Tidak ditetapkan")}</option>
              {accounts.data
                ?.filter((a) => a.currency === currency && !a.archived)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="form-field">
            {c("Start date", "Tarikh mula")}
            <input
              className="input"
              required
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="form-field">
            {c("End date (optional)", "Tarikh tamat (pilihan)")}
            <input
              className="input"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label className="form-field">
            {c("Frequency", "Kekerapan")}
            <select
              className="input"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
            >
              {(["daily", "weekly", "monthly", "yearly"] as const).map(
                (v, i) => (
                  <option key={v} value={v}>
                    {c(
                      ["Daily", "Weekly", "Monthly", "Yearly"][i],
                      ["Harian", "Mingguan", "Bulanan", "Tahunan"][i],
                    )}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="form-field">
            {c("Interval", "Selang")}
            <input
              className="input"
              type="number"
              min={1}
              max={366}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            />
          </label>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <Button disabled={data.rule.isPending}>
            {c("Save recurring rule", "Simpan peraturan berulang")}
          </Button>
        </form>
      </Modal>
    </section>
  );
}

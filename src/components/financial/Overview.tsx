import { financialDate } from "@/domain/dates";
import {
  accountBalance,
  debtProgress,
  objectiveProgress,
} from "@/domain/progress";
import { useTransactions } from "@/hooks/useFinanceData";
import { usePlatformTable } from "@/hooks/usePlatformData";
import { useAppStore } from "@/store/useAppStore";
import { usePlatformText } from "./copy";
import { Failure, money } from "./shared";
export function FinancialOverview() {
  const L = usePlatformText();
  const timezone = useAppStore((s) => s.financialTimezone);
  const accounts = usePlatformTable("accounts");
  const objectives = usePlatformTable("objectives");
  const contributions = usePlatformTable("objective_contributions");
  const debts = usePlatformTable("person_debts");
  const repayments = usePlatformTable("debt_repayments");
  const transactions = useTransactions();
  const { setActiveTab } = useAppStore();
  if (
    [accounts, objectives, contributions, debts, repayments, transactions].some(
      (q) => q.isPending,
    )
  )
    return (
      <section className="card p-5" role="status">
        {L("Loading financial progress…")}
      </section>
    );
  const error = [
    accounts,
    objectives,
    contributions,
    debts,
    repayments,
    transactions,
  ].find((q) => q.error);
  if (error)
    return (
      <Failure
        error={error.error}
        retry={() =>
          void Promise.all([
            accounts.refetch(),
            objectives.refetch(),
            contributions.refetch(),
            debts.refetch(),
            repayments.refetch(),
            transactions.refetch(),
          ])
        }
      />
    );
  const tx = transactions.data ?? [];
  const activeDebts = (debts.data ?? []).filter(
    (d) => !debtProgress(d, repayments.data ?? [], tx, timezone).settled,
  );
  const owe = activeDebts.filter((d) => d.direction === "i_owe");
  const receivable = activeDebts.filter((d) => d.direction === "owed_to_me");
  const activeGoals = (objectives.data ?? []).filter(
    (o) =>
      o.status !== "archived" &&
      !objectiveProgress(o, contributions.data ?? [], tx).completed,
  );
  const next =
    owe.find(
      (d) => debtProgress(d, repayments.data ?? [], tx, timezone).overdue,
    ) ??
    owe.sort((a, b) =>
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"),
    )[0];
  const recent = [
    ...(contributions.data ?? []).map((c) => ({
      id: c.id,
      date: c.contributed_at,
      label:
        (objectives.data ?? []).find((o) => o.id === c.objective_id)?.name ??
        L("Goal"),
      amount: c.effective_amount ?? c.amount ?? "0",
      currency: c.currency,
      kind: L("Contribution"),
    })),
    ...(repayments.data ?? []).map((r) => ({
      id: r.id,
      date: r.paid_at,
      label:
        (debts.data ?? []).find((d) => d.id === r.debt_id)?.counterparty ??
        L("Debt"),
      amount: r.effective_amount ?? r.amount ?? "0",
      currency: r.currency,
      kind: L("Repayment"),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  return (
    <section className="space-y-4" aria-label={L("Financial summary")}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          className="card p-5 text-left hover:border-primary"
          onClick={() => setActiveTab("accounts")}
        >
          <span className="text-sm text-subtle">
            {L("Linked account position")}
          </span>
          <strong className="mt-2 block text-2xl">
            {(accounts.data ?? []).filter((a) => !a.archived).length}{" "}
            {L("accounts")}
          </strong>
          <span className="mt-2 block text-xs text-subtle">
            {(accounts.data ?? [])
              .filter((a) => !a.archived)
              .map(
                (a) => `${a.name}: ${money(accountBalance(a, tx), a.currency)}`,
              )
              .join(" · ") || L("Add an account to track balances")}
          </span>
        </button>
        <button
          className="card p-5 text-left hover:border-primary"
          onClick={() => setActiveTab("debts")}
        >
          <span className="text-sm text-subtle">{L("Money I owe")}</span>
          <strong className="mt-2 block text-2xl">
            {owe.length} {L("active")}
          </strong>
          <span className="mt-2 block text-xs text-subtle">
            {owe
              .map(
                (d) =>
                  `${money(debtProgress(d, repayments.data ?? [], tx, timezone).remaining, d.currency)} ${d.counterparty}`,
              )
              .join(" · ") || L("No active debts")}
          </span>
        </button>
        <button
          className="card p-5 text-left hover:border-primary"
          onClick={() => setActiveTab("goals")}
        >
          <span className="text-sm text-subtle">{L("Goals & savings")}</span>
          <strong className="mt-2 block text-2xl">
            {activeGoals.length} {L("in progress")}
          </strong>
          <span className="mt-2 block text-xs text-subtle">
            {activeGoals
              .slice(0, 2)
              .map(
                (o) =>
                  `${o.name} ${objectiveProgress(o, contributions.data ?? [], tx).percent.toFixed(0)}%`,
              )
              .join(" · ") || L("Set a meaningful target")}
          </span>
        </button>
        <button
          className="card p-5 text-left hover:border-primary"
          onClick={() => setActiveTab("debts")}
        >
          <span className="text-sm text-subtle">{L("Owed to me")}</span>
          <strong className="mt-2 block text-2xl">
            {receivable.length} {L("active")}
          </strong>
          <span className="mt-2 block text-xs text-subtle">
            {L("Receivables are separate from available cash.")}
          </span>
        </button>
      </div>
      {next && (
        <button
          className="warning-message block w-full text-left"
          onClick={() => setActiveTab("debts")}
        >
          <strong>
            {debtProgress(next, repayments.data ?? [], tx, timezone).overdue
              ? L("Overdue debt")
              : L("Next financial action")}
            :
          </strong>{" "}
          {L("Record progress on")}{" "}
          {money(
            debtProgress(next, repayments.data ?? [], tx, timezone).remaining,
            next.currency,
          )}{" "}
          {L("owed to")} {next.counterparty}
          {next.due_date ? L(` · due ${next.due_date}`) : ""}.
        </button>
      )}
      {recent.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold">{L("Recent progress")}</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {recent.map((item) => (
              <li key={item.id} className="rounded-lg bg-muted p-3 text-xs">
                <strong>
                  {item.kind}: {money(item.amount, item.currency)}
                </strong>
                <span className="mt-1 block text-subtle">
                  {item.label} · {financialDate(item.date, timezone)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

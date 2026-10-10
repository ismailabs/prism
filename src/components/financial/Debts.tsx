import { financialDate } from "@/domain/dates";
import { debtProgress } from "@/domain/progress";
import { useTransactions } from "@/hooks/useFinanceData";
import { usePlatformMutation, usePlatformTable } from "@/hooks/usePlatformData";
import { errorMessage } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Currency, DebtDirection, PersonDebt } from "@/types";
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
import { usePlatformText } from "./copy";
import { Failure, ProgressBar, currencies, money, positive } from "./shared";
import { DebtPlanner } from './DebtPlanner';
export function DebtsPage() {
  const L = usePlatformText();
  const timezone = useAppStore((s) => s.financialTimezone);
  const accounts = usePlatformTable("accounts");
  const debts = usePlatformTable("person_debts");
  const repayments = usePlatformTable("debt_repayments");
  const contributions = usePlatformTable("objective_contributions");
  const transactions = useTransactions();
  const debtMutations = usePlatformMutation("person_debts");
  const repaymentMutations = usePlatformMutation("debt_repayments");
  const [selected, setSelected] = useState<string | null>(()=>typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('item'));
  const [open, setOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const [editing, setEditing] = useState<PersonDebt | null>(null);
  const [deleting, setDeleting] = useState<PersonDebt | null>(null);
  const [direction, setDirection] = useState<DebtDirection>("i_owe");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("MYR");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const current = (debts.data ?? []).find((d) => d.id === selected) ?? null;
  const deletionHasHistory = !!deleting &&
    (repayments.data ?? []).some((r) => r.debt_id === deleting.id);
  function begin(d?: PersonDebt) {
    setEditing(d ?? null);
    setDirection(d?.direction ?? "i_owe");
    setCounterparty(d?.counterparty ?? "");
    setAmount(d?.original_amount ?? "");
    setCurrency(d?.currency ?? useAppStore.getState().currency);
    setDueDate(d?.due_date ?? "");
    setNotes(d?.notes ?? "");
    setOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!positive(amount, currency))
      return toast.error(L("Enter a positive original amount."));
    try {
      const values = {
        direction,
        counterparty: counterparty.trim(),
        original_amount: amount,
        currency,
        due_date: dueDate || null,
        notes,
      };
      if (editing)
        await debtMutations.update.mutateAsync({ id: editing.id, values });
      else await debtMutations.create.mutateAsync(values);
      setOpen(false);
      toast.success(L("Debt saved"));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function repay(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    if (!positive(amount, current.currency))
      return toast.error(L("Enter a positive repayment."));
    try {
      await repaymentMutations.create.mutateAsync({
        debt_id: current.id,
        currency: current.currency,
        amount,
        transaction_id: null,
        account_id: link || null,
        note: "",
        paid_at: new Date().toISOString(),
      });
      setRepayOpen(false);
      setAmount("");
      setLink("");
      toast.success(L("Repayment recorded"));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function removeDebt() {
    if (!deleting) return;
    try {
      await debtMutations.remove.mutateAsync(deleting.id);
      if (selected === deleting.id) setSelected(null);
      setDeleting(null);
      toast.success(L("Personal debt deleted"));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const error =
    debts.error ||
    repayments.error ||
    contributions.error ||
    transactions.error;
  if (error)
    return (
      <Failure
        error={error}
        retry={() =>
          void Promise.all([
            debts.refetch(),
            repayments.refetch(),
            contributions.refetch(),
            transactions.refetch(),
          ])
        }
      />
    );
  const busy =
    debts.isPending ||
    repayments.isPending ||
    contributions.isPending ||
    transactions.isPending;
  return (
    <div className="space-y-5">
      <div className="feature-intro">
        <p className="text-sm text-subtle">
          {L(
            "Track money between people in both directions. Amounts owed to you are receivables, not available cash.",
          )}
        </p>
        <Button onClick={() => begin()}>
          <Plus size={16} />
          {L("New debt")}
        </Button>
      </div>
      {busy ? (
        <p role="status">{L("Loading debts…")}</p>
      ) : !(debts.data ?? []).length ? (
        <div className="card empty-state">
          <h2>{L("No personal debts recorded")}</h2>
          <p>
            {L(
              "Record what you owe or what someone owes you, then log repayments.",
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            {(debts.data ?? []).map((d) => {
              const p = debtProgress(
                d,
                repayments.data ?? [],
                transactions.data ?? [],
                timezone,
              );
              return (
                <button
                  key={d.id}
                  aria-pressed={selected === d.id}
                  className={`card selection-card block w-full p-5 text-left hover:border-primary ${selected === d.id ? "border-primary" : ""}`}
                  onClick={() => setSelected(d.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {d.direction === "i_owe" ? (
                        <ArrowUpRight size={17} className="text-orange-600" />
                      ) : (
                        <ArrowDownLeft size={17} className="text-emerald-600" />
                      )}
                      <div>
                        <h2 className="font-semibold">{d.counterparty}</h2>
                        <p className="text-xs text-subtle">
                          {d.direction === "i_owe"
                            ? L("I owe")
                            : L("Owed to me")}{" "}
                          ·{" "}
                          {p.settled
                            ? L("Settled")
                            : p.overdue
                              ? L("Overdue")
                              : L("Active")}
                        </p>
                      </div>
                    </div>
                    <strong>{money(p.remaining, d.currency)}</strong>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={p.percent} tone="debt" />
                  </div>
                  <p className="mt-2 text-xs text-subtle">
                    {p.percent.toFixed(1)}
                    {L("% repaid")}
                    {d.due_date ? L(` · due ${d.due_date}`) : ""}
                  </p>
                </button>
              );
            })}
          </div>
          {current ? (
            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">
                    {current.direction === "i_owe"
                      ? L("MONEY I OWE")
                      : L("MONEY OWED TO ME")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {current.counterparty}
                  </h2>
                  <p className="mt-2 text-sm text-subtle">
                    {current.notes || L("No notes added.")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => begin(current)}>
                    {L("Edit")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={L(`Delete debt with ${current.counterparty}`)}
                    disabled={(repayments.data??[]).some(r=>r.debt_id===current.id)}
                    onClick={() => setDeleting(current)}
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                </div>
              </div>
              {(repayments.data ?? []).some(r => r.debt_id === current.id) && <p role="alert" className="mt-3 text-sm text-subtle">{L('This debt has repayments. Keep its history and cash effects until reversal support is available.')}</p>}
              {(() => {
                const p = debtProgress(
                  current,
                  repayments.data ?? [],
                  transactions.data ?? [],
                  timezone,
                );
                return (
                  <>
                    <div className="mt-7 flex items-baseline justify-between">
                      <strong className="text-2xl">
                        {money(p.remaining, current.currency)}
                      </strong>
                      <span className="text-sm text-subtle">
                        {p.settled
                          ? L("Settled")
                          : p.overdue
                            ? L("Overdue")
                            : L("Outstanding")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-subtle">
                      {L("Original")}{" "}
                      {money(current.original_amount, current.currency)}{" "}
                      {L("· Repaid")} {money(p.paid, current.currency)}
                    </p>
                    <div className="mt-4">
                      <ProgressBar value={p.percent} tone="debt" />
                    </div>
                  </>
                );
              })()}
              <Button
                className="mt-5"
                disabled={
                  debtProgress(
                    current,
                    repayments.data ?? [],
                    transactions.data ?? [],
                    timezone,
                  ).settled
                }
                onClick={() => {
                  setAmount("");
                  setLink("");
                  setRepayOpen(true);
                }}
              >
                <Plus size={16} />
                {L("Record repayment")}
              </Button>
              <div className="mt-8">
                <h3 className="font-semibold">{L("Repayment history")}</h3>
                <ul className="mt-3 divide-y divide-border">
                  {(repayments.data ?? [])
                    .filter((r) => r.debt_id === current.id)
                    .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
                    .map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-2 py-3 text-sm"
                      >
                        <div>
                          <strong>
                            {money(
                              r.effective_amount ?? r.amount ?? "0",
                              current.currency,
                            )}
                          </strong>
                          <p className="text-xs text-subtle">
                            {financialDate(r.paid_at, timezone)} ·{" "}
                            {r.transaction_id
                              ? L("Linked transaction")
                              : L("Manual")}
                          </p>
                        </div>
                        <span className="text-xs text-subtle">{L('History preserved')}</span>
                      </li>
                    ))}
                  {!(repayments.data ?? []).some(
                    (r) => r.debt_id === current.id,
                  ) && (
                    <li className="py-3 text-sm text-subtle">
                      {L("No repayments recorded.")}
                    </li>
                  )}
                </ul>
                <p className="mt-3 text-xs text-subtle">{L('Repayment history is preserved. Corrections require an audited reversal after ledger integration.')}</p>
              </div>
            </section>
          ) : (
            <div className="card empty-state">
              <h2>{L("Select a debt")}</h2>
              <p>{L("See the balance and payment history.")}</p>
            </div>
          )}
        </div>
      )}
      {!busy&&<DebtPlanner debts={debts.data??[]}/>}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? L("Edit personal debt") : L("New personal debt")}
      >
        <form className="space-y-4" onSubmit={(event) => void save(event)}>
          <label className="form-field">
            {L("Direction")}
            <select
              className="input"
              value={direction}
              disabled={!!editing&&(repayments.data??[]).some(r=>r.debt_id===editing.id)}
              onChange={(e) => setDirection(e.target.value as DebtDirection)}
            >
              <option value="i_owe">{L("I owe someone")}</option>
              <option value="owed_to_me">{L("Someone owes me")}</option>
            </select>
          </label>
          <label className="form-field">
            {L("Person")}
            <input
              className="input"
              required
              maxLength={100}
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-field">
              {L("Original amount")}
              <input
                className="input"
                required
                inputMode="decimal"
                value={amount}
                disabled={!!editing&&(repayments.data??[]).some(r=>r.debt_id===editing.id)}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="form-field">
              {L("Currency")}
              <select
                className="input"
                disabled={!!editing}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="form-field">
            {L("Due date (optional)")}
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label className="form-field">
            {L("Notes")}
            <textarea
              className="input"
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              {L("Cancel")}
            </Button>
            <Button
              disabled={
                !counterparty.trim() ||
                !positive(amount, currency) ||
                debtMutations.create.isPending ||
                debtMutations.update.isPending
              }
            >
              {L("Save debt")}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={repayOpen}
        onOpenChange={setRepayOpen}
        title={L("Record repayment")}
      >
        <form className="space-y-4" onSubmit={(event) => void repay(event)}>
          <label className="form-field">
            {L("Cash account (optional)")}
            <select
              className="input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            >
              <option value="">
                {L("Historical repayment without cash movement")}
              </option>
              {accounts.data
                ?.filter((a) => current && a.currency === current.currency)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="form-field">
            {L("Repayment amount (")}
            {current?.currency})
            <input
              className="input"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <p className="text-xs text-subtle">
            {L(
              "Principal changes cash and outstanding debt, never ordinary income or spending.",
            )}
          </p>
          <p className="text-xs text-subtle">
            {L("Maximum outstanding:")}{" "}
            {current
              ? money(
                  debtProgress(
                    current,
                    repayments.data ?? [],
                    transactions.data ?? [],
                    timezone,
                  ).remaining,
                  current.currency,
                )
              : "—"}
          </p>
          <div className="modal-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setRepayOpen(false)}
            >
              {L("Cancel")}
            </Button>
            <Button
              disabled={
                repaymentMutations.create.isPending ||
                !current ||
                !positive(amount, current.currency)
              }
            >
              {L("Record repayment")}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value && !debtMutations.remove.isPending) setDeleting(null);
        }}
        title={L("Delete personal debt")}
        description={L(
          "Only debts with no repayment history can be deleted.",
        )}
      >
        {deleting && (
          <>
            <p>
              {L("Delete the")}{" "}
              <strong>
                {deleting.direction === "i_owe" ? L("I owe") : L("Owed to me")}
              </strong>{" "}
              {L("record for")} <strong>{deleting.counterparty}</strong>?
            </p>
            <p className="mt-3 text-sm text-subtle" role={deletionHasHistory ? "alert" : undefined}>
              {L(
                deletionHasHistory
                  ? "This debt has repayments. Keep its history and cash effects until reversal support is available."
                  : "No repayments are recorded for this debt. Deleting the empty record cannot be undone.",
              )}
            </p>
            <div className="modal-actions mt-6">
              <Button
                variant="outline"
                disabled={debtMutations.remove.isPending}
                onClick={() => setDeleting(null)}
              >
                {L("Cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={debtMutations.remove.isPending || deletionHasHistory}
                onClick={() => void removeDebt()}
              >
                {debtMutations.remove.isPending
                  ? L("Deleting…")
                  : L("Delete permanently")}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
